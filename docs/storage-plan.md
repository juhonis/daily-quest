# Daily Quest — Storage Plan

Two-phase update to the current `localStorage`-only persistence:

- **Phase A:** Export / Import — let users move their data between browsers and devices with a file.
- **Phase B:** Optional Google OAuth + Firebase cloud sync — app stays fully usable anonymously/local-first; signing in syncs to the cloud.

**Decisions locked in:**
- Cloud backend: **Firebase** (Firestore) — easy + free tier sufficient.
- Import behavior: **Replace, with backup** (confirmation dialog; auto-download a backup first).
- Export format: **Plain JSON** (no encryption). No secrets exist in the data today; encryption can be added later if cloud accounts introduce sensitive data.
- UI: **Reuse the Settings gear** (currently opens `EditPanelsModal`) to open a Settings/Data modal with Export & Import. Exact placement (candidate: top-right of the right column) decided later.
- Validation: **Hand-rolled validator** (typed guard functions + vitest). No new dependency.

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
    "filterTags": [],
    "filterNoteTags": [],
    "locationMode": "auto",
    "locationName": "",
    "coords": null
  }
}
```

**Included:** user data + preferences (everything above).
**Excluded:** transient UI only — `selectedDate`, `leftColumnOverride`, `rightColumnOverride`. Rationale: the user's *view* shouldn't be restored on a different device; the app computes its own "today".

### 2.2 Export

- New pure util `src/utils/exportImport.ts`:
  - `exportData(state: AppState): string` — builds the versioned JSON from store state.
  - Reads via `useStore.getState()` at call time.
- Download as `daily-quest-<YYYY-MM-DD>.json` using a `Blob` + anchor click (works on desktop and mobile browsers).

### 2.3 Import (Replace, with backup)

Flow in the Settings/Data modal:

1. User picks a `.json` file via `<input type="file">`.
2. Parse + validate with hand-rolled guards:
   - `app === 'daily-quest'`
   - `schemaVersion` is a supported number
   - per-collection shape checks (arrays, required fields, type guards for `Quest`, `CompletionRecord`, `Note`, `QuickPreset`, etc.)
   - reject with a clear, user-facing error message on failure (never partially apply).
3. Confirmation dialog: *"This replaces all current local data. A backup of your current data will be downloaded first."*
4. On confirm: auto-download current data as `<same-name>.bak.json`, then call a new store action `importData(data)` which overwrites the relevant slices via `set()` — bypassing the persist `merge` (that merge is only for missing-field migration, not import).
5. UI updates immediately (store write re-renders); no page reload needed.

### 2.4 Store changes

- Add `importData(payload: ImportPayload): void` to `useStore.ts` / `AppState` in `types/index.ts`. Sets all user-data + preference slices, leaves transient UI untouched (or resets to sensible defaults).
- No changes to how `persist` stores state — import just writes the same shape back through `set()`.

### 2.5 UI

- Extend the existing Settings gear (`QuestsColumn.tsx`) to open a new `SettingsModal` (or add a "Data" section to `EditPanelsModal` — prefer a separate modal to keep panel editing focused).
- `SettingsModal` contains:
  - **Export** — one button, downloads the JSON.
  - **Import** — file picker + confirm flow with error display.
  - *(Phase B will add an Account section here.)*
- Reuse `Modal` for a11y (focus trap, Esc, aria attributes).

### 2.6 Tests (vitest)

- Validator: accepts a valid export; rejects wrong app name, unsupported `schemaVersion`, truncated/malformed JSON, wrong field types, missing required fields.
- Roundtrip: `exportData(state)` → `parseImport(json)` → produces equivalent state.
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

- Add `updatedAt: string` to `Quest` and `CompletionRecord` (Note already has it). Required for last-write-wins sync.
- Persist `merge` already handles new/missing fields, so existing localStorage users upgrade transparently.
- `ImportPayload` should include `updatedAt` so Phase A backups remain forward-compatible with Phase B.

### 3.4 Sync architecture

Keep components store-only. Add a sync engine under `src/features/sync/` (e.g. `firebaseClient.ts`, `auth.ts`, `syncEngine.ts`, `useAuth.ts`).

**Dual mode:**
- **Anonymous (default):** everything local, identical behavior to today. No Firebase calls.
- **Signed in:** cloud becomes source of truth *after merge*; app still fully works offline (Firestore persistence queues writes).

**Lifecycle:**
1. *Sign in (Google):* fetch user's cloud data → merge with local data per-entity, LWW by `updatedAt` → persist merged result locally → start subscriptions.
2. *First sign-in (empty cloud):* upload local data as initial state.
3. *Steady state:* Firestore realtime subscription pushes cloud changes into the store; a debounced store-change subscriber pushes local edits to Firestore.
4. *Conflict resolution:* v1 = last-write-wins per entity by `updatedAt`. Documented as a simplification.
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
1. **Phase A** on the current `feat/export` branch — export/import util + validator + tests, store `importData`, Settings/Data modal.
2. **Phase B** (later branch) — `updatedAt` schema fields → Firebase client + auth → sync engine → account UI in Settings modal → env config + rules.

**Open questions (deferred):**
- Exact UI placement of Export/Import (candidate: top-right of right column) and whether it should be a separate `SettingsModal` or a section inside `EditPanelsModal`.
- Whether sign-out should offer a manual merge on next sign-in (v2).
- Whether to keep Firestore per-collection docs vs. a single `users/{uid}/data` doc (v1 decision: per-collection for fine-grained realtime sync and smaller writes).
