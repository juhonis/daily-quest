# Architecture and maintenance

## Code map

| Path | Responsibility |
|---|---|
| `client/src/components/{layout,ui}` | App shell and reusable controls/dialogs |
| `client/src/features` | Calendar, quests, notes, weather, settings, sync |
| `client/src/hooks`, `client/src/utils` | Shared behavior and pure helpers |
| `client/src/store/useStore.ts` | Zustand actions, persistence, migration, tracked sync changes |
| `client/src/types/index.ts` | Domain types |
| `client/src/utils/{dateUtils,exportImport}.ts` | Calendar logic and backup validation |
| `client/src/utils/sync` | Causal records, merging, validation, chunked protocol |
| `client/src/utils/{appNavigation,pwaUpdates}.ts` | Screen/modal history and service-worker updates |
| `client/functions/api/sync` | Same-origin proxy to the pairing Worker |
| `sync-worker/src/index.ts` | Worker and SQLite-backed pairing Durable Object |

Keep business logic in features/pure helpers and shared controls generic. Subscribe to specific Zustand fields; make application-data changes through tracked store actions. Validate `unknown` network/file data before use.

## State and dates

- Application data and device preferences persist in `localStorage['daily-quest-store']`. Different origins, ports, and browser profiles have separate stores.
- Calendar values (`targetDate`, `completedOn`, `selectedDate`) are local `YYYY-MM-DD` strings. Use `dateUtils.ts` for recurrence, comparisons, and local Today.
- New `createdAt`/`updatedAt` values and note archive times use ISO timestamps. Quest archive dates are day strings. Preserve valid legacy timestamps; normalization fills missing/invalid values without restamping existing revisions.
- Recurring completions are keyed by quest/date. Parked quests are inactive; archived quests retain history. Carry-forward has no expiry unless `maxRolloverDays` is set.
- Editing preserves IDs and unknown/advanced metadata. Generate new identities with `utils/createId.ts`, including its secure-random HTTP fallback.
- Editor drafts live outside the application store: `daily-quest-editor:v1:...` and `daily-note-editor:v1:...`, keyed by a sessionStorage tab identity. Appearance/history state is also separate from synced content.

## Backups and restore

- Export is plain JSON: `app: 'daily-quest'`, `schemaVersion: 2`, `exportedAt`, `data`, and `sync`. Schema v1 remains importable; newer unsupported versions are rejected.
- Includes user records, durable panel/color preferences, location mode/name, revisions, tombstones, and recovery records.
- Excludes coordinates, view filters, selected date, column overrides, active replica identity, editor drafts, and note-appearance preference.
- Import validates before replacing data. A backup download is offered but is not a required click-gate. Coordinates reset; manual weather location must be reselected.
- Restore is an intentional new causal change, not adoption of an old device identity. Omitted known records become deletions; restored content keeps historical timestamps.
- Keep export backups: sync propagates deletions, and the pairing service holds no app-content backup.

## Sync invariants

- Fresh replica identity per tab/load; per-record version-vector counters establish ancestry. SHA-256-derived roots distinguish differing pre-sync content.
- Equal content deduplicates. Causally newer revisions succeed older ones; concurrent values select a deterministic primary. Alternate note/quest/preset edits get stable recovery identities.
- Deletions use retained tombstones. Concurrent deletion hides the original and preserves edited content for recovery. Concurrent unchecked completion wins; a later deliberate re-check succeeds it.
- Keep orphan completion history without recreating deleted quests. Built-in preset edits/deletions behave as overrides.
- **Do not prune tombstones by age** or fill optional fields inside received revision payloads: either can break convergence or revive records.
- Merge against current local state. Two transfer rounds catch intermediate edits; final-round changes can require another sync.
- Wire protocol v1 is independent of backup schema v2. Transfers are chunked, checksummed, validated, and acknowledged only after local persistence. Interrupted one-sided application is retried idempotently; there is no distributed atomic commit.
- One sync session per browser profile uses Web Locks. Same-origin tabs reconcile persisted revisions without sharing a revision-counter identity.

Sync scope, operational limits, and deployment: [device-sync.md](device-sync.md). Reported exceptions: [sync-known-issues.md](sync-known-issues.md).

## UI, history, and services

- History stores screen/dialog tokens and scroll positions, not editor content. Reader-to-editor handoffs replace a slot; declined discard restores it. Use shared `Modal` for focus, cancellation, and keyboard bounds.
- Preserve native keyboard/pinch behavior, visible focus, labeled controls, reduced motion, and touch alternatives to drag. Mobile notes use a scroll body with fixed actions.
- Open-Meteo provides current/hourly weather; RainViewer provides radar frames, OpenStreetMap standard raster tiles the basemap (no API key). Coordinates stay device-local but are sent to the weather services when used.
- Radar must keep its Leaflet instance across responsive relocation; invalidate dimensions while preserving center/zoom. Keep it lazy-loaded and non-modal.
- PWA assets/cache configuration is in `client/vite.config.ts`; the update notice waits for an explicit reload outside dialogs. Never cache the pairing API as an app-shell navigation.

Tests and release checks: [testing.md](testing.md). XP is reserved metadata; gamification and cloud app-content storage are not implemented.
