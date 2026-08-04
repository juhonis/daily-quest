# Daily Quest — Storage Plan

Two-phase update to the current `localStorage`-only persistence:

- **Phase A:** Export / Import — let users move their data between browsers and devices with a file.
- **Phase B:** Optional Google OAuth + Firebase cloud sync — app stays fully usable anonymously/local-first; signing in syncs to the cloud.

**Decisions locked in:**
- Cloud backend: **Firebase** (Firestore) — easy + free tier sufficient.
- Import behavior: **Replace, with backup** (two-step confirm — a *Download backup* button must be used before *Replace & import* is enabled).
- Export format: **Plain JSON** (no encryption). No secrets exist in the data today; encryption can be added later if cloud accounts introduce sensitive data.
- UI: **Reuse the Settings gear** (currently opens `EditPanelsModal`) to open a Settings/Data modal with Export & Import. Exact placement (candidate: top-right of the right column) decided later.
- Validation: **Hand-rolled validator** (typed guard functions + vitest). No new dependency.
- `updatedAt` on `Quest` + `CompletionRecord` lands in **Phase A**, stamped on every create/update (Note already has it). Phase A exports carry timestamps, so backups are forward-compatible with Phase B LWW sync.
- Import confirm is **two-step:** a *Download backup* button gates the *Replace & import* button, so data is never replaced without an initiated backup.
- `importData` **self-defaults** missing optional fields — the persist `merge` runs only on localStorage rehydration, not on `set()`.
- **Excluded from export:** `coords` (device-specific) plus view filters (`filterTags`, `filterNoteTags`).
- Pre-upgrade `updatedAt` is filled by an **entity-level normalization step inside the persist `merge`** (not at export), so the live store stays LWW-ready for Phase B.

---

## 1. Current State (for context)

- Zustand `persist` → `localStorage` under key `daily-quest-store` (`client/src/store/useStore.ts`).
- One JSON blob holds **all** state, mixing:
  - **User data:** `quests`, `notes`, `completions`, `quickPresets`
  - **Preferences:** `panelOrder`, `hiddenPanels`, `mergedPanels`, `tagPanels`, `tagColors`, `noteTagColors`, `filterTags`, `filterNoteTags`, `locationMode`, `locationName`, `coords`
  - **Transient UI:** `selectedDate`, `leftColumnOverride`, `rightColumnOverride`
- Pure static SPA (docker nginx / Cloudflare). No backend, no accounts.
- Existing patterns to reuse: `Modal` (`components/ui/Modal.tsx` — focus trap + Esc), `Button`, persist `merge` migration.

---

## 2. Phase A — Export / Import

### 2.1 Export format

Versioned JSON so future schema changes stay loadable:

```json
{
  "app": "daily-quest",
  "schemaVersion": 1,
  "exportedAt": "2026-08-03T12:00:00.000Z",
  "data": {
    "quests": [],
    "completions": [],
    "notes": [],
    "quickPresets": [],
    "panelOrder": [],
    "hiddenPanels": [],
    "mergedPanels": {},
    "tagPanels": [],
    "tagColors": {},
    "noteTagColors": {},
    "locationMode": "auto",
    "locationName": ""
  }
}
```

`Quest` and `CompletionRecord` now carry an `updatedAt: string` field (added in Phase A, required by Phase B's last-write-wins sync); `Note` already has it.

**Included:** user data + durable preferences (everything above).
**Excluded:** transient view state and device-specific data — `selectedDate`, `leftColumnOverride`, `rightColumnOverride`, `filterTags`, `filterNoteTags`, `coords`. Rationale: a *view* (current day, active filters, open columns) shouldn't be restored on a different device; the app computes its own "today". `coords` is device-specific — importing it would pin the new device to stale coordinates. (`locationMode`/`locationName` stay exported; after an import that restores `manual` mode, the user re-picks a location so `coords` is re-fetched. Weather renders nothing when `coords` is `null` (`CurrentWeather.tsx`/`WeatherCarousel.tsx`/`RainRadar.tsx` early-return), so the modal should add a small hint after import: "if you use a manual location, re-pick it to restore weather".)

### 2.2 Export

- New pure util `src/utils/exportImport.ts`:
  - `exportData(state: AppState): string` — builds the versioned JSON from store state.
  - Reads via `useStore.getState()` at call time.
- Download as `daily-quest-<YYYY-MM-DD>.json` using a `Blob` + anchor click (works on desktop and mobile browsers).
- Exports roundtrip `updatedAt`. Pre-upgrade localStorage data (no `updatedAt`) is migrated by an **entity-level normalization step in the persist `merge`** (§2.4) at rehydration — not by export. Keeping the *live store* normalized matters for Phase B, which reads the live store (not exports).

### 2.3 Import (Replace, with backup)

Flow in the Settings/Data modal:

1. User picks a `.json` file via `<input type="file">`.
2. Parse + validate with hand-rolled guards:
   - `app === 'daily-quest'`
   - `schemaVersion` is a supported number — anything above the current version is a **hard reject** with a clear message (never guess a future format)
   - per-collection shape checks (arrays, required fields, type guards for `Quest`, `CompletionRecord`, `Note`, `QuickPreset`, etc.)
   - reject with a clear, user-facing error message on failure (never partially apply).
3. Confirmation dialog: *"This replaces all current local data. Download a backup of your current data first."* Offers a **Download backup** button (saves current data as `<same-name>.bak.json`).
4. **Replace & import** stays disabled until the backup download has been initiated — the gate guarantees a backup exists before data is replaced, even if the browser later blocks the download.
5. On confirm: call a new store action `importData(data)` which overwrites the relevant slices via `set()` — bypassing the persist `merge` (that merge is only for missing-field migration, not import).
6. UI updates immediately (store write re-renders); no page reload needed.

**Validation is lenient:** missing optional fields (incl. `updatedAt`) are defaulted by `importData`, never rejected — older backups stay loadable. Imported `updatedAt` values are preserved **verbatim** (backup-restore semantics — no re-stamping at import time). `coords` is not part of the export; `importData` resets it to `null`.

### 2.4 Store changes

- Add `importData(payload: ImportPayload): void` to `useStore.ts` / `AppState` in `types/index.ts`. Sets all user-data + preference slices; resets state that isn't part of the export — `filterTags`/`filterNoteTags` → `[]`, `coords` → `null` — and leaves `selectedDate` + column overrides as-is.
- `importData` builds a **complete state slice**, filling defaults for missing optional fields (`description`, `repeatConfig`, `sortOrder`, `tags`, `archivedAt`, `xp`, `maxRolloverDays`, ...). It must not rely on the persist `merge` — that runs only on localStorage rehydration, not on `set()`. Missing `updatedAt` is defaulted via the **same shared normalize helpers** the `merge` uses (below), so both paths stamp identical values.
- Mutations stamp `updatedAt` on `Quest`/`CompletionRecord` — **every mutator**, not just the obvious ones:
  - quests: `addQuest`, `updateQuest`, `addQuestFromPreset`, `activateQuest`, `archiveQuest`
  - completions: `toggleCompletion` (on create; removal just deletes the record), `toggleSubQuest` (sub-quest state **and** the completion it creates/removes)
  - notes: `NoteCreateModal` already stamps; extend `updateNote`, `archiveNote`, `unarchiveNote` to stamp too
  - tag operations mutate entities in bulk and must stamp **each affected entity**: `deleteTag`/`renameTag` (all `quests` with that tag), `deleteNoteTag` (all `notes` with that tag)
  - the `QuestCreateForm` save path stamps through `addQuest`/`updateQuest` (store-side), so no form change is needed
  - `addQuestFromPreset` also switches `createdAt` from `getTodayLocal()` (`YYYY-MM-DD`) to `new Date().toISOString()` — one line, zero risk (`createdAt` is display-sort only), removes mixed-format `createdAt` from new exports.
- **Shared entity normalization + entity-level migration:** extract `normalizeQuest`/`normalizeCompletion`/`normalizeNote` into a single module (export from `exportImport.ts` or a small `normalize.ts`), used by **both** the persist `merge` and `importData`, so they stamp identical defaults. Each normalizer fills missing `updatedAt` as full ISO (`new Date(createdAt).toISOString()` for quests, `new Date(completedOn).toISOString()` for completions) with an **invalid-date guard**: if `Number.isNaN(date.getTime())` (covers empty/undefined/`null`/garbage), fall back to `new Date(0).toISOString()` (epoch — a valid ISO that sorts oldest, so a corrupt value loses LWW cleanly) rather than throwing a `RangeError` during hydration. Normalizing to one format matters because `createdAt` is already mixed-format today (`QuestCreateForm.tsx` writes ISO, `addQuestFromPreset` writes `YYYY-MM-DD`); a single format keeps Phase B LWW string compares unambiguous. This is how pre-upgrade localStorage data migrates; it keeps the live store consistent for Phase B and guarantees exports always carry `updatedAt`. `importData` intentionally does **not** rely on the merge running — it calls the same normalizers itself (§2.3).
- No changes to how `persist` stores state — import just writes the same shape back through `set()`.

### 2.5 UI

- Extend the existing Settings gear (`QuestsColumn.tsx`) to open a new `SettingsModal` (or add a "Data" section to `EditPanelsModal` — prefer a separate modal to keep panel editing focused).
- `SettingsModal` contains:
  - **Export** — one button, downloads the JSON.
  - **Import** — file picker + confirm flow with error display.
  - *(Phase B will add an Account section here.)*
- Reuse `Modal` for a11y (focus trap, Esc, aria attributes).
- The "Download backup" gate is a **soft guarantee** — clicking it satisfies the gate even if the browser blocks the download or opens it in a viewer (iOS Safari commonly opens Blob downloads in a tab rather than saving). Acceptable for v1; the button remains the only path to Replace.

### 2.6 Tests (vitest)

- Validator: accepts a valid export; rejects wrong app name, unsupported/above-current `schemaVersion`, truncated/malformed JSON, wrong field types, missing required fields. Accepts a missing `updatedAt` (defaulted, not rejected).
- Roundtrip: `exportData(state)` → `parseImport(json)` → produces equivalent state, including `updatedAt`. The fixture seeds non-empty `coords`/`filterTags`/`filterNoteTags` and asserts they are omitted from the payload and reset by `importData` (otherwise equivalence passes trivially on empty state).
- Store-level `importData` test: user-data + preference slices replaced, view/device state reset (`filterTags`, `coords`), missing optional fields defaulted.
- `merge` migration test: rehydrating pre-upgrade localStorage entities fills `updatedAt` normalized to ISO (quests → `new Date(createdAt).toISOString()`, completions → `new Date(completedOn).toISOString()`).
- `merge` test for the invalid-date guard: corrupt/empty/`null` `createdAt` or `completedOn` in persisted state does not throw and falls back to `new Date(0).toISOString()` (epoch).
- Co-located as `client/src/utils/exportImport.test.ts` (matches `dateUtils.test.ts` pattern).

---

## 3. Phase B — Firebase Cloud Sync (Google OAuth)

### 3.1 Why Firebase

- Decision: easy + free. Free tier is ample for a personal task app: 1GB Firestore storage, 50k reads / 20k writes / 50k deletes per day, 50k MAU.
- Google OAuth is near-trivial via Firebase Auth (popup or redirect; redirect is most reliable in PWA/installed contexts).
- Firestore ships built-in offline persistence — great fit for an offline-first PWA.
- Trade-offs accepted: SaaS-only, vendor lock-in. Data model is simple enough that migration to another store later is a contained mapping exercise.

### 3.2 Data model (Firestore)

Top-level collections, every document carrying an `ownerId` gated by security rules:

| Collection | Document | Contents |
|---|---|---|
| `quests` | `{questId}` | `Quest` + `ownerId`, `updatedAt` |
| `completions` | `{completionId}` | `CompletionRecord` + `ownerId`, `updatedAt` |
| `notes` | `{noteId}` | `Note` + `ownerId`, `updatedAt` (already present) |
| `quickPresets` | `{presetId}` | `QuickPreset` + `ownerId` |
| `prefs` | `{uid}` | `panelOrder`, `hiddenPanels`, `mergedPanels`, `tagPanels`, `tagColors`, `noteTagColors`, `filterTags`, `filterNoteTags`, `locationMode`, `locationName`, `coords` |
| `users` | `{uid}` | profile metadata (createdAt, displayName) |

**Security rules:** read/write only when `request.auth.uid == resource.data.ownerId` (create also sets `ownerId` server-side via rules check).

### 3.3 Schema evolution (local types)

- `updatedAt: string` is added to `Quest` and `CompletionRecord` in **Phase A** (§2.1) — Note already has it. Phase A exports carry timestamps natively, so backups are forward-compatible; Phase B only consumes them for last-write-wins sync.
- The persist `merge` is extended in Phase A to normalize per-entity fields (§2.4), so existing localStorage users upgrade transparently and the live store is always LWW-ready.

### 3.4 Sync architecture

Keep components store-only. Add a sync engine under `src/features/sync/` (e.g. `firebaseClient.ts`, `auth.ts`, `syncEngine.ts`, `useAuth.ts`).

**Dual mode:**
- **Anonymous (default):** everything local, identical behavior to today. No Firebase calls.
- **Signed in:** cloud becomes source of truth *after merge*; app still fully works offline (Firestore persistence queues writes).

**Lifecycle:**
1. *Sign in (Google):* fetch user's cloud data → merge with local data per-entity, LWW by `updatedAt` → persist merged result locally → start subscriptions.
2. *First sign-in (empty cloud):* upload local data as initial state.
3. *Steady state:* Firestore realtime subscription pushes cloud changes into the store; a debounced store-change subscriber pushes local edits to Firestore.
4. *Conflict resolution:* v1 = last-write-wins per entity by `updatedAt`. Documented as a simplification. **Deletes are an open gap:** toggling a completion off removes the record (no tombstone), so create-vs-delete races can't be resolved by LWW. v1 ships deletion as best-effort doc deletes; a tombstone scheme is a possible v2.
5. *Sign out:* keep local copy; cloud remains. Local changes made while signed out are **not** auto-merged on next sign-in (documented limitation; future: offer a manual merge prompt).

### 3.5 Config & dependencies

- Add `firebase` (or modular `firebase/app`, `firebase/auth`, `firebase/firestore`) dependency.
- Vite env vars + `.env.example`:
  `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
- Firebase client API key is publishable by design — security comes from rules, not key secrecy.

### 3.6 Deployment / infra notes

- No server needed; static hosting (docker/Cloudflare) unchanged.
- Firebase console setup checklist: enable Google auth provider → create Firestore DB → deploy security rules (test → production) → copy config to `.env`.
- PWA: `vite-plugin-pwa` already installed; auth redirect needs `authDomain` configured with the deployed host (Cloudflare/docker domain).

---

## 4. Rollout order & open questions

**Order:**
1. **Phase A** on the current `feat/export` branch — add `updatedAt` to `Quest`/`CompletionRecord` → export/import util + validator + tests → store `importData` → Settings/Data modal.
2. **Phase B** (later branch) — Firebase client + auth → sync engine → account UI in Settings modal → env config + rules.

**Resolved during plan review (2026-08-04):**
- `coords` excluded from export (device-specific); `importData` resets it to `null`.
- `filterTags`/`filterNoteTags` excluded as transient view-state (like `selectedDate`).
- Pre-upgrade `updatedAt` migrates via the persist `merge` at **entity level**, not only at export.
- `updatedAt` is stamped on **all** mutators (`activateQuest`, `archiveQuest`, note archive/unarchive), not just create/update.
- Import preserves imported `updatedAt` verbatim (backup-restore semantics).
- `schemaVersion` above the current version is a hard reject.
- `.bak` gate is a soft click-gate (browser may block/redirect the download).
- `updatedAt` stamped on tag mutations too: `deleteTag`/`renameTag` (affected quests), `deleteNoteTag` (affected notes).
- `updatedAt` defaults are normalized to full ISO (`new Date(createdAt).toISOString()` / `new Date(completedOn).toISOString()`) because `createdAt` is already mixed-format today.
- Roundtrip fixture seeds `coords`/`filterTags` so the test asserts they are excluded and reset, not just present-by-default.
- Shared `normalizeQuest`/`normalizeCompletion`/`normalizeNote` used by both `merge` and `importData` (identical defaults), each with an invalid-date guard falling back to `new Date(0).toISOString()` (epoch).
- `addQuestFromPreset` writes ISO `createdAt` so new exports are uniform.

**Open questions (deferred):**
- Exact UI placement of Export/Import (candidate: top-right of right column) and whether it should be a separate `SettingsModal` or a section inside `EditPanelsModal`.
- Whether sign-out should offer a manual merge on next sign-in (v2).
- Whether to keep Firestore per-collection docs vs. a single `users/{uid}/data` doc (v1 decision: per-collection for fine-grained realtime sync and smaller writes).
- Tombstones for deletions (Phase B v2) to resolve create-vs-delete races (§3.4).
- Hardening the backup gate (e.g., verify a file was saved) vs. the current soft click-gate (§2.5).
- Whether the Phase B cloud `prefs` doc should also drop view/device fields (`filterTags`, `filterNoteTags`, `coords`), consistent with the export exclusions (§3.2 lists them today).
