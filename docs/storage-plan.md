# Daily Quest — Storage Plan

DEBUG:`copy(localStorage.getItem('daily-quest-store'))`
Two-phase update to the current `localStorage`-only persistence:

- **Phase A (implemented):** Export / Import — let users move their data between browsers and devices with a file. Section 2 retains the implementation specification and historical review notes.
- **Phase B (implemented; deployment acceptance pending):** Manual peer-to-peer sync — pair two open apps using a temporary code or QR link, with Cloudflare handling connection setup and WebRTC transferring data directly between devices. See [device-sync.md](device-sync.md) for setup and implementation details.

**Decisions locked in:**
- Sync architecture: **Cloudflare pairing service + direct WebRTC data transfer**, without accounts or cloud storage of app data. The Firebase/Google OAuth proposal has been retired.
- Import behavior: **Replace, with optional backup download**. The original Phase A backup click-gate described below was subsequently removed; the replacement confirmation still offers a backup download.
- Export format: **Plain JSON** (no encryption). No secrets exist in the data today; encryption can be added later if cloud accounts introduce sensitive data.
- UI: **Reuse the Settings gear** (currently opens `EditPanelsModal`) to open a Settings/Data modal with Export & Import. Exact placement (candidate: top-right of the right column) decided later.
- Validation: **Hand-rolled validator** (typed guard functions + vitest). No new dependency.
- `updatedAt` on `Quest` + `CompletionRecord` lands in **Phase A**, stamped on every create/update (Note already has it). Phase B adds causal revision metadata; timestamps alone do not identify concurrent edits.
- Import confirm is **two-step:** a *Download backup* button gates the *Replace & import* button, so data is never replaced without an initiated backup.
- `importData` **self-defaults** missing optional fields — the persist `merge` runs only on localStorage rehydration, not on `set()`.
- **Excluded from export:** `coords` (device-specific) plus view filters (`filterTags`, `filterNoteTags`).
- Pre-upgrade `updatedAt` is filled by an **entity-level normalization step inside the persist `merge`** (not at export), so the live store has consistent timestamps.

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

Historical implementation specification: the current UI permits replacement without a required backup click, and Phase B extends the export schema to v2 with sync metadata (§3.8).

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

`Quest` and `CompletionRecord` now carry an `updatedAt: string` field (added in Phase A); `Note` already has it. Phase B supplements timestamps with causal revisions.

**Included:** user data + durable preferences (everything above).
**Excluded:** transient view state and device-specific data — `selectedDate`, `leftColumnOverride`, `rightColumnOverride`, `filterTags`, `filterNoteTags`, `coords`. Rationale: a *view* (current day, active filters, open columns) shouldn't be restored on a different device; the app computes its own "today". `coords` is device-specific — importing it would pin the new device to stale coordinates. (`locationMode`/`locationName` stay exported; after an import that restores `manual` mode, the user re-picks a location so `coords` is re-fetched. Weather renders nothing when `coords` is `null` (`CurrentWeather.tsx`/`WeatherCarousel.tsx`/`RainRadar.tsx` early-return), so the modal should add a small hint after import: "if you use a manual location, re-pick it to restore weather".)

### 2.2 Export

- New pure util `src/utils/exportImport.ts`:
  - `exportData(state: AppState): string` — builds the versioned JSON from store state.
  - Reads via `useStore.getState()` at call time.
- Download as `daily-quest-<YYYY-MM-DD>.json` using a `Blob` + anchor click (works on desktop and mobile browsers). The date in the filename is rendered from `getTodayLocal()` (local date), not UTC — avoids "yesterday" filenames around midnight.
- Exports roundtrip `updatedAt`. Pre-upgrade localStorage data (no `updatedAt`) is migrated by an **entity-level normalization step in the persist `merge`** (§2.4) at rehydration — not by export. Keeping the *live store* normalized matters for Phase B, which reads the live store (not exports).

### 2.3 Import (Replace, with backup)

Flow in the Settings/Data modal:

1. User picks a `.json` file via `<input type="file">`.
2. Parse + validate with hand-rolled guards:
   - `app === 'daily-quest'`
   - `schemaVersion` is a supported number — anything above the current version is a **hard reject** with a clear message (never guess a future format)
   - per-collection shape checks (arrays, required fields, type guards for `Quest`, `CompletionRecord`, `Note`, `QuickPreset`, etc.)
   - security guards: `externalUrl` must match `^https?://`; `tagColors`/`noteTagColors` values must match `^#[0-9a-fA-F]{6}$` (or `rgb(...)`) — malformed values are a hard reject (see §2.3 security note)
   - reject with a clear, user-facing error message on failure (never partially apply).
3. Confirmation dialog: *"This replaces all current local data. Download a backup of your current data first."* Offers a **Download backup** button (saves current data as a date-stamped `daily-quest-backup-<YYYY-MM-DD>.json`, local date via `getTodayLocal()` — clearer than deriving a name from the picked import file).
4. **Replace & import** stays disabled until the backup download has been initiated — the gate guarantees a backup exists before data is replaced, even if the browser later blocks the download.
5. On confirm: call a new store action `importData(data)` which overwrites the relevant slices via `set()` — bypassing the persist `merge` (that merge is only for missing-field migration, not import).
6. UI updates immediately (store write re-renders); no page reload needed.

**Validation is lenient:** missing optional fields (incl. `updatedAt`) are defaulted by `importData`, never rejected — older backups stay loadable. Imported `updatedAt` values are preserved **verbatim** (backup-restore semantics — no re-stamping at import time). `coords` is not part of the export; `importData` resets it to `null`.

**Security guards (import-time, hard reject, not lenient):** values that flow unsanitized into runtime sinks must be validated, since their shape can't be made safe by defaulting:
- `externalUrl` on quests/presets is rendered via `window.open(externalUrl)` (`QuestCard.tsx`, `QuestHistoryPanel.tsx`) with no sanitizer. Reject any `externalUrl` that doesn't match `^https?://`. This is a real XSS/URL-injection vector — unlike `NoteViewModal`, which sanitizes via `react-markdown`'s default `urlTransform`.
- `tagColors` / `noteTagColors` are applied directly to React `style` objects (React does not sanitize style values). Reject any color that doesn't match `^#[0-9a-fA-F]{6}$` (or a bare `rgb(...)`). Low risk in practice (modern browsers won't execute JS from these CSS props) but cheap to enforce.
- `note.color` is a **third** unsanitized style sink — applied directly to `style={{ backgroundColor }}` in `NoteCard.tsx` and `NoteViewModal.tsx`, same class as `tagColors`. Validate it against the same color regex (the app only writes the fixed `NOTE_COLORS` palette of 6-digit hex).

**Guard must match what the app itself produces (test this):** stored `tagColors`/`noteTagColors` are *always* 6-digit palette hex (`tagColors.ts` `TAG_PALETTE` / `assignTagColor`), so `^#[0-9a-fA-F]{6}$` is correct — but the render path derives **8-digit** hex (`getTagStyle` appends alpha: `${color}33`/`4D`/`1A`). The validator must run on *stored* values, not the derived 8-digit forms, or it will reject the app's own exports.

**Duplicate-entity validation:** a hand-edited or corrupt-but-parseable file could contain two `Quest`s with the same `id`, or two `CompletionRecord`s with the same `questId`+`completedOn`. Replace-import would then produce React duplicate-key breakage and `toggleCompletion` toggling the wrong record. The validator **dedupes-or-hard-rejects** duplicate entity IDs (one pass, near-free).

Both of the above are treated as malformed input → hard reject with a clear message, matching the `schemaVersion`-above-current behavior.

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
- `updateQuest` must **force-stamp** `updatedAt`, not inherit it from `updates`: `QuestsColumn.tsx`'s `onSave` passes the *whole rebuilt quest object* (which `QuestCreateForm` builds **without** an `updatedAt` field) into `updateQuest`. Always overwrite `updatedAt` on merge; never trust `updates.updatedAt`.
- **Harden the persist `merge` against non-object persisted state:** today's `merge` does `p.panelOrder ?? current.panelOrder` with no guard (`useStore.ts`). If `localStorage['daily-quest-store']` ever holds a valid-JSON non-object (e.g. `"null"`, `5`, or a sync-tool write), it throws → white-screen on load. Phase A is restructuring this `merge` for normalization anyway, so add a `typeof p === 'object' && p !== null` guard at the top before any field access. This is exactly the corrupt-data case the import/backup flow is meant to recover from.
- **Normalizers must be strictly fill-only, never re-stamp** a valid existing `updatedAt`. If they re-wrote every rehydration, LWW would silently bump every entity and Phase B conflict resolution breaks. Only fill when `updatedAt` is absent or invalid.
- **QuickPreset `updatedAt` — added in Phase A.** Presets are user-editable/deleteable. Use the same normalize + mutator-stamp pattern as Quest/CompletionRecord (`addQuickPreset`, `updateQuickPreset`); Phase B adds causal revision tracking for presets too.
- **Shared entity normalization + entity-level migration:** extract `normalizeQuest`/`normalizeCompletion`/`normalizeNote` into a single module (export from `exportImport.ts` or a small `normalize.ts`), used by **both** the persist `merge` and `importData`, so they stamp identical defaults. Each normalizer fills missing `updatedAt` as full ISO (`new Date(createdAt).toISOString()` for quests, `new Date(completedOn).toISOString()` for completions) with an **invalid-date guard**: if `Number.isNaN(date.getTime())` (covers empty/undefined/`null`/garbage), fall back to `new Date(0).toISOString()` (epoch — a valid ISO that sorts oldest, so a corrupt value loses LWW cleanly) rather than throwing a `RangeError` during hydration. Normalizing to one format matters because `createdAt` is already mixed-format today (`QuestCreateForm.tsx` writes ISO, `addQuestFromPreset` writes `YYYY-MM-DD`); a single format keeps Phase B LWW string compares unambiguous. This is how pre-upgrade localStorage data migrates; it keeps the live store consistent for Phase B and guarantees exports always carry `updatedAt`. `importData` intentionally does **not** rely on the merge running — it calls the same normalizers itself (§2.3).
- No changes to how `persist` stores state — import just writes the same shape back through `set()`.

### 2.4.1 Upgrade / Migration — existing users

Existing `localStorage` data (key `daily-quest-store`) upgrades transparently on first load — **no data is lost or rewritten**, and no re-import is needed.

- On rehydration, the hardened `merge` (§2.4) runs the fill-only normalizers over `quests`/`completions`/`notes`/`quickPresets`. All existing fields are spread through untouched; normalizers only **add** `updatedAt`:
  - quests → `new Date(createdAt).toISOString()`
  - completions → `new Date(completedOn).toISOString()`
  - notes → backfilled from `createdAt` (very old notes missing it)
  - quickPresets → epoch (`1970-01-01T00:00:00.000Z`); presets have no natural date — invisible in the UI, only relevant to Phase B LWW
- A valid existing `updatedAt` is preserved **verbatim** (never re-stamped). Corrupt/empty/garbage timestamps fall back to epoch rather than throwing.
- The normalized shape is written back to localStorage by persist, so the next load is already clean.
- **Before merging to production:** verify once against real persisted data (dev build) — confirm quests render normally and the stored quests/completions now carry `updatedAt`.
- **Known, accepted quirks:** `createdAt` stays mixed-format until it rotates out (only new preset-created quests write ISO; `createdAt` is display-sort only); the third-party seed presets carry a static `2023-03-20` timestamp.

### 2.5 UI

- Extend the existing Settings gear (`QuestsColumn.tsx`) to open a new `SettingsModal` (or add a "Data" section to `EditPanelsModal` — prefer a separate modal to keep panel editing focused).
- `SettingsModal` contains:
  - **Export** — one button, downloads the JSON.
  - **Import** — file picker + confirm flow with error display.
  - *(Phase B will add a Sync devices section here.)*
- Reuse `Modal` for a11y (focus trap, Esc, aria attributes).
- The "Download backup" gate is a **soft guarantee** — clicking it satisfies the gate even if the browser blocks the download or opens it in a viewer (iOS Safari commonly opens Blob downloads in a tab rather than saving). Acceptable for v1; the button remains the only path to Replace.

### 2.6 Tests (vitest)

- Validator: accepts a valid export; rejects wrong app name, unsupported/above-current `schemaVersion`, truncated/malformed JSON, wrong field types, missing required fields. Accepts a missing `updatedAt` (defaulted, not rejected).
- Validator security guards: rejects `externalUrl` that isn't `^https?://` (e.g. `javascript:` / `data:` schemes) and rejects `tagColors`/`noteTagColors` values that aren't `#hex` or `rgb(...)` — each with a hard reject, never a partial apply. Also rejects a non-palette `note.color`. Guard-format test: a *valid* export whose `tagColors`/`noteTagColors` are 6-digit palette hex is accepted, while the derived 8-digit form (`#RRGGBBAA` from `getTagStyle`) is rejected — asserts the validator runs on stored, not render-derived, values.
- Validator duplicate check: rejects or dedupes files with duplicate `Quest` ids or duplicate `questId`+`completedOn` completions.
- Roundtrip: `exportData(state)` → `parseImport(json)` → produces equivalent state, including `updatedAt`. The fixture seeds non-empty `coords`/`filterTags`/`filterNoteTags` **and all optional fields** (`sortOrder`, `xp`, `tags`, `description`, `repeatConfig`, `maxRolloverDays`, `icon`, `externalUrl`) and asserts `coords`/`filterTags`/`filterNoteTags` are omitted from the payload and reset by `importData`. Seeding all optionals forces the test to assert pass-through rather than vacuously comparing to defaults (otherwise equivalence passes trivially on empty state).
- Store-level `importData` test: user-data + preference slices replaced, view/device state reset (`filterTags`, `coords`), missing optional fields defaulted.
- `merge` migration test: rehydrating pre-upgrade localStorage entities fills `updatedAt` normalized to ISO (quests → `new Date(createdAt).toISOString()`, completions → `new Date(completedOn).toISOString()`).
- `merge` test for the invalid-date guard: corrupt/empty/`null` `createdAt` or `completedOn` in persisted state does not throw and falls back to `new Date(0).toISOString()` (epoch).
- Co-located as `client/src/utils/exportImport.test.ts` (matches `dateUtils.test.ts` pattern).

---

## 3. Phase B — Manual Peer-to-Peer Sync (Cloudflare + WebRTC)

**Status: implemented and verified locally. Cloudflare production provisioning and physical-device acceptance remain deployment steps.**

Implementation notes:
- Fresh replica identity per tab/load with per-record causal counters; SHA-256-derived roots identify pre-sync content without assuming shared ancestry.
- Stable recovery records preserve alternate edits. Network validation preserves revision content exactly rather than filling optional fields and changing its identity.
- Host-only ICE candidates in v1; no external STUN/TURN service or data relay.
- Two snapshot rounds plus persistence acknowledgements; the UI flags final-round edits that need another sync.
- Schema-v2 backups preserve sync metadata and support intentional restores; schema-v1 backups remain importable.
- Local checks: client unit tests/lint/build, Worker type checks/runtime tests, and actual two-profile Chromium WebRTC tests for pairing, conflicts, repeat sync, restore deletions, and cross-tab locking/cancellation.
- Deployment instructions and operational limits: [device-sync.md](device-sync.md).

### 3.1 Goals and agreed decisions

- Sync occasionally and explicitly, without starting a home server or running one continuously.
- Combine changes from both devices; neither device replaces the other's whole dataset.
- Keep the app local-first, account-free, and usable offline between sync sessions.
- Keep the existing GitHub-integrated Cloudflare Pages deployment.
- Use Cloudflare only for temporary pairing/signaling; transfer app data directly over an encrypted WebRTC data channel.
- Both apps must be open to sync. Internet access is needed for Cloudflare pairing, even on the same Wi-Fi.
- Target same-Wi-Fi use first. Being on the same Wi-Fi does not guarantee connectivity: guest isolation, firewalls, and browser networking restrictions can prevent a direct connection.

### 3.2 Cloudflare architecture and cost

```text
Browser A -- HTTPS / WebSocket --> Pages /api/sync --> Worker + Durable Object
Browser B -- HTTPS / WebSocket --> Pages /api/sync --> same pairing session

Browser A <======== encrypted WebRTC data channel ========> Browser B
                 notes, quests, completions, presets
```

- Deploy a small Worker containing a **SQLite-backed Durable Object** for short-lived pairing coordination. Cloudflare requires the Durable Object to be deployed separately from the Pages project.
- Bind the Worker to a Pages Function at `/api/sync`; keep the app-facing API on the existing origin. Route only the API through Functions so ordinary static asset requests remain static.
- Use hibernatable WebSockets for signaling and an expiry alarm for cleanup. Durable session state contains only pairing/connection metadata, never app records.
- Expire sessions after a few minutes; close connections and delete temporary state on completion, cancellation, or expiry. Do not log codes, join credentials, signaling payloads, or app data.
- Initial version uses direct WebRTC only, without TURN/data relay. Decide whether an external STUN service is needed after browser/network testing and document any chosen dependency. STUN exchanges network discovery information, not app data.

**Free-tier confirmation (checked 2026-10-27):**

| Resource | Current Workers Free allowance |
|---|---|
| Workers / Pages Functions requests | 100,000 per day; 10 ms CPU per invocation |
| Durable Object requests | 100,000 per day |
| Durable Object duration | 13,000 GB-seconds per day |
| SQLite-backed Durable Object storage | 5 GB total; 5 million rows read and 100,000 rows written per day |

SQLite-backed Durable Objects are available on Workers Free; a paid subscription is not required for this design. Occasional personal pairing should fit comfortably within the allowances. Limits are account-level usage allowances, not a reservation for this app. On the Free plan, exceeding a quota causes affected operations to fail rather than automatically charging overages. A Workers Paid subscription has a minimum monthly charge and different billing rules; keep this deployment on Free if zero cost is the goal. Recheck pricing before deployment.

Sources:
- <https://developers.cloudflare.com/workers/platform/pricing/>
- <https://developers.cloudflare.com/durable-objects/platform/pricing/>
- <https://developers.cloudflare.com/pages/functions/bindings/#durable-objects>

### 3.3 Pairing and UI

Add **Sync devices** to the existing Settings modal:

1. Device A selects **Start sync**; create a session and show a cryptographically generated temporary pairing code plus a QR join link.
2. Device B selects **Join sync** and enters the code, or scans the QR using its normal camera and opens the link. An in-app camera scanner is not required initially.
3. Both devices display a short verification value derived from the negotiated connection. The initiating device explicitly confirms the peer before app data is sent.
4. Establish the WebRTC channel, exchange and validate sync envelopes, combine changes, and persist locally.
5. Show a summary of additions, updates, deletions, and preserved conflicts; acknowledge receipt/application and close the session.

- Two peers maximum; atomically reserve the guest slot. A short human-readable code is a lookup aid, not a long-lived authentication credential. Issue separate unpredictable host/guest session credentials.
- Apply session-creation and join-attempt limits, origin checks, message-size limits, single-use pairing, and expiry. QR join secrets should use URL fragments and be removed from the address bar after consumption.
- UI states: idle, creating/joining, awaiting peer, verifying, connecting, transferring, applying, complete, cancelled, expired, and failed.
- Include cancel/retry actions and useful offline, unsupported-browser, unavailable-service, and blocked-connection errors. No automatic background syncing.
- Opening a QR link should open the sync UI without requiring the user to navigate back into Settings. Exclude API traffic and join URLs from inappropriate service-worker caching/navigation fallback.

### 3.4 Sync scope

**Include:** quests (including subquests), notes, daily completions, custom presets, and tag/note-tag colors.

**Keep device-local:** selected date, filters, panel visibility/order/merges, tag-panel layout, column overrides, weather location/name/mode/coordinates, and device identity.

Built-in presets remain deterministic seeds. Track user edits/deletions of a built-in preset as overrides, so syncing cannot reset a customization or resurrect a removed preset.

### 3.5 Revision metadata and migration

- Use a fresh local replica ID per tab/load and monotonic counters per record. Persist causal revisions using version vectors (replica ID → counter); fresh identities avoid copied device IDs and cross-tab counter reuse.
- Keep `updatedAt` for display and deterministic ordering; do not use wall-clock timestamps alone to decide whether edits are concurrent.
- Retain deletion records (tombstones), including unchecked completion state. Completion identity is the tuple `(questId, completedOn)`, not the random completion record ID.
- Track mutations atomically with their revisions through store actions, including archive/unarchive, subquest toggles, sorting, tag rename/delete, preset changes, and bulk imports. Audit direct `setState` writes and other mutation paths.
- Initialize pre-sync entities without changing their IDs/content/timestamps. Equal legacy content must deduplicate; differing legacy content with no common history is treated as a conflict rather than assuming the newest timestamp is correct.
- Deletions made before this upgrade cannot be inferred; an existing item on one device can reappear on the first sync if the other removed it before deletion tracking existed.
- Do not prune tombstones based only on age: infrequently used devices must not resurrect old data. Retain causal/deletion metadata initially; any future compaction needs an explicit device-retirement/acknowledgement protocol.
- Handle multiple tabs sharing localStorage: prevent concurrent sync sessions within one browser profile and ensure replica counters cannot collide across tabs. Reconcile local tab changes before applying incoming state.

### 3.6 Combining and conflict rules

The merge must be deterministic, commutative, and idempotent: peer order and repeated transfers must not change the outcome or create duplicate recovery copies.

| Situation | Result |
|---|---|
| Item exists only on one device, with no known deletion | Add it to the other |
| One revision causally succeeds another | Use the succeeding revision |
| Same content/revision on both | Deduplicate |
| Concurrent note edits | Keep a deterministic primary and preserve alternate text as a clearly labeled conflict copy |
| Concurrent quest/preset edits | Choose a deterministic primary and preserve alternate content as a recoverable conflict record |
| Deletion causally succeeds an edit | Delete the active record and retain the tombstone |
| Concurrent deletion and edit | Keep the original deleted; preserve edited content as a recovery copy |
| Concurrent checked/unchecked completion changes | Unchecked wins; combine causal context so a later deliberate re-check succeeds |
| Concurrent color changes | Deterministic winner per tag key; explicit deletion must also carry a revision |

- Define a stable total order over revision/content identifiers for concurrent winners; an entity's own ID cannot break ties between versions of that same entity.
- Derive conflict-copy identities from source identity and losing revision, so repeated syncs do not create duplicates. Preserve provenance and expose recovery records in the UI with restore/dismiss actions.
- Keep completion/quest references consistent. A completion for a deleted quest must not recreate that quest; specify cleanup/recovery behavior in the merge implementation and tests.
- Merge incoming data against the latest local state, not an earlier transfer snapshot. Edits made during transfer remain tracked; either run a final catch-up round or explicitly report pending changes for the next sync.

### 3.7 Transfer protocol and persistence

- Version the wire protocol independently from the backup schema. Reject unsupported versions with a useful message before applying anything.
- Transfer bounded, numbered chunks with flow control over an ordered reliable data channel. Limit aggregate bytes, entity counts, metadata sizes, and transfer duration.
- Validate the full reconstructed payload before application. Reuse entity validators where appropriate, but do not import the peer's device preferences or identity through the backup replacement path.
- Use session/transfer identifiers, payload integrity checks, and acknowledgements to distinguish connection success, receipt, and successful local persistence.
- Stage and apply a validated merge in one local store update. Catch storage quota/write failures; do not claim success unless persistence succeeds.
- There is no distributed atomic commit between browsers. If one side applies and the connection drops, report an incomplete session; retry safely using idempotent merging.

### 3.8 Backups and restores

- Extend the versioned export format to include sync revisions, tombstones, and recovery records; retain support for current schema-v1 backups.
- Never copy the exporting device's active replica identity/counter into another browser. A restored installation must use a safe local identity and fresh revisions for restore operations.
- Keep the existing replace-with-backup import UX. A restore is an intentional local change: stamp restored differences with revisions succeeding the local known state and record deletions for locally present items omitted from the backup. Retain causal context rather than blindly replacing it with old metadata.
- Preserve restored content and historical `updatedAt` values; causal restore revisions, rather than timestamp restamping, make the restore syncable.
- Changes on another device that the restoring device has never seen remain concurrent and follow the recovery rules. A restore does not silently erase unseen remote edits.
- Document that local exports remain necessary backups: peer-to-peer sync propagates changes and deletions, and Cloudflare holds no recovery copy of app data.

### 3.9 Files, dependencies, and deployment

Expected implementation areas:
- `client/src/store/useStore.ts` and `client/src/types/index.ts`: metadata, migration, tracked mutations, merge application.
- `client/src/features/settings/SettingsModal.tsx` and new `client/src/features/sync/`: pairing UI, join-link handling, signaling, transport, orchestration, and recovery UI.
- Pure sync merge/validation utilities plus meaningful co-located tests.
- `client/src/utils/exportImport.ts`: backup schema evolution and restore integration.
- `client/functions/api/sync/`: same-origin Pages Function endpoints, assuming the existing Pages project root is `client` (verify dashboard settings before wiring paths).
- New `sync-worker/` directory: Worker/Durable Object source, Wrangler configuration, and runtime tests.
- Pages binding/routing configuration, PWA exclusions, a small QR-generation dependency, and deployment documentation.

Deployment:
1. Provision/deploy the SQLite-backed Durable Object Worker using Wrangler, then bind it to Pages. No app-content database, Firebase project, or login provider is needed.
2. Keep frontend deploys through existing GitHub → Pages integration. Confirm Pages builds Functions as well as `dist` assets and preserves the `/api/sync` routes alongside SPA redirects.
3. Add a GitHub Actions workflow for Worker deployments, using narrowly scoped Cloudflare credentials in GitHub secrets. Deploy compatible Worker changes before frontend changes that require them.
4. Configure production and preview bindings separately; previews must not join production sessions. Document local Wrangler development alongside Vite.
5. Verify Free-plan compatibility and quotas in the actual account, then exercise pairing from the deployed app on two real devices.

### 3.10 Verification and rollout

Implementation order:
1. Review and approve this plan.
2. Implement revision metadata, migration, merge/recovery rules, and backup/restore semantics with tests.
3. Implement Cloudflare pairing and the WebRTC transfer protocol.
4. Add Settings/join-link/progress/recovery UI and deployment configuration.
5. Run `npm run test:run`, `npm run lint`, and `npm run build` in `client`, plus Worker checks; deploy and perform two-device acceptance testing.

Required coverage:
- Merge commutativity/idempotence, independent offline edits, equal timestamps, skewed clocks, identical/differing legacy data, and three-device transitive syncing.
- Deletes, completion unchecks/rechecks, concurrent deletion/edit, subquests, bulk tag operations, preset overrides, and stable conflict-copy deduplication.
- Schema-v1/vNext restores, replica identity handling, multi-tab counter allocation, and malformed/oversized payload rejection.
- Expired/incorrect codes, simultaneous guest joins, confirmation gating, cancellation, cleanup, rate limits, and incompatible protocol versions.
- Interrupted transfers before/after one-sided application, retry, local edits during transfer, and localStorage quota failures.
- Real desktop/mobile browsers, installed PWA and ordinary tabs, QR join links, same-Wi-Fi pairing, and useful failures on isolated networks.

Acceptance: both devices converge after a successful sync, repeated syncs make no duplicate changes, offline edits survive, deleted records stay deleted, conflicts remain recoverable, and completion is reported only after both sides acknowledge successful persistence.
