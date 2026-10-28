# Sync known issues and investigation backlog

**Status: deferred.** The next active priority is the frontend overhaul and mobile optimization. This document preserves the sync findings for a later investigation; the causes below are not yet confirmed.

For deployment and normal operation, see [device-sync.md](device-sync.md). For the architecture and conflict rules, see [storage-plan.md](storage-plan.md#3-phase-b--manual-peer-to-peer-sync-cloudflare--webrtc).

## Current rollout findings

- Sync has been deployed to production and used successfully between a PC and laptop in Chrome.
- The PC runs Windows and connects by Ethernet; the laptop runs Windows and connects by Wi-Fi on the same home network.
- No VPN or guest Wi-Fi was reported.
- Successful transport does not establish that every merge or browser scenario behaves correctly. The two issues below remain open.

## SYNC-001 — Existing notes unexpectedly required manual recovery

**Status:** reported in production; not reproduced or diagnosed.

### Observed behavior

- Notes existed on the PC but were not visible on the laptop before syncing.
- After sync, the user reported having to restore the notes individually through Sync recovery on both devices, rather than seeing them automatically added.
- The user restored the notes and deferred further investigation.

### Expected behavior

- A note present on one device and absent on a genuinely fresh device should be copied automatically.
- An absent note alone must not be interpreted as a deletion.
- Recovery should preserve genuinely competing versions or concurrent deletion/edit conflicts, rather than being required for an ordinary first transfer.

### Unconfirmed hypotheses

- Earlier imports, restores, or deletions left deletion records (tombstones) for the same note IDs on one device.
- The visible note arrays disagreed with their persisted sync metadata. `ensureSync` only initializes missing record keys, so an existing metadata record may take precedence over inconsistent visible content during projection.
- A first-sync or migration path incorrectly classified existing notes as conflicts.
- An archived version won a conflict and hid a note from the normal notes list, making recovery appear necessary.

The current deletion-wins rule can explain recovery on both peers if an explicit tombstone was involved, but its involvement in this incident has not been established. Do not change that rule solely on this report: it also prevents intentionally deleted notes from reappearing.

### Missing evidence

- The exact production-origin import, restore, deletion, and prior-sync history of both browser profiles.
- Whether the laptop was truly fresh, or only had an empty visible notes list.
- Whether all affected PC notes disappeared from the normal list, or some recovery items were alternate versions of still-visible notes.
- Pre-sync exports and per-note revisions/tombstones from the original failure. Manual restoration may have superseded those revisions.
- Exact browser versions and whether multiple app tabs or older app versions were active.

Preview and production origins have separate browser storage. Preview testing alone should not change production metadata; investigate any explicit export/import between origins separately.

### Investigation sequence

1. Preserve exports from both browser profiles before attempting reproduction. Use disposable profiles and fixtures for destructive scenarios.
2. Reproduce a populated pre-sync/legacy store syncing with a completely fresh store. Test both choices of initiating device.
3. Repeat with notes created after sync tracking was installed.
4. Add histories individually: archived notes, explicit deletion, schema-v1 import, schema-v2 restore, empty-backup restore, and repeated sync.
5. Check behavior when visible content and persisted metadata disagree, including loading an older app against storage written by a newer version.
6. Capture affected record IDs, revision vectors, tombstone/live state, archive state, and recovery provenance before and after each stage. Note text is not needed in diagnostic logs.
7. Follow hydration → `ensureSync` → merge → `projectSync` → persistence to locate the first unexpected transition.
8. Add a regression test for the confirmed reproduction before implementing a fix. Recheck intentional deletion propagation, concurrent edit recovery, and repeated-sync idempotence.

### Relevant code

- `client/src/utils/sync/state.ts`: `ensureSync`, `trackChanges`, `projectSync`, `restoreSync`.
- `client/src/utils/sync/records.ts`: `mergeHeads`, `primary`, recovery generation in `mergeRecords`.
- `client/src/store/useStore.ts`: persistence hydration, `latestSync`, `applySync`, imports, recovery actions, and cross-tab reconciliation.
- `client/src/utils/sync/validation.ts`: preserving revision identity during validation.
- `client/src/features/sync/RecoveryPanel.tsx`: visibility and meaning of restore/dismiss actions.
- `client/e2e/sync.e2e.ts`: browser regression coverage.

### Resolution criteria

- A populated device and a genuinely fresh device converge with all notes visible automatically and no spurious recovery items.
- Intentional deletes still propagate; concurrent deleted/edited content remains recoverable.
- Retrying or repeating sync does not add duplicate notes or recovery items.
- If stale metadata is confirmed, define and test repair behavior that preserves content without silently resurrecting known deletions.

## SYNC-002 — Firefox could not establish a direct connection

**Status:** Firefox failure reported; Chrome succeeded on the same two physical devices. Cause unconfirmed.

### Observed behavior

- Firefox on the Windows PC and Windows laptop failed with: “Could not connect directly. Use the same non-guest Wi-Fi and check firewall settings.”
- Private Firefox was used during testing.
- Chrome subsequently connected successfully between the devices.
- Regular Firefox was suggested as an isolation test, but no result was reported.

This does not establish that Firefox Private Browsing itself caused the failure. Private mode supports WebRTC; browser settings, address discovery, network reachability, or signaling behavior still need checking.

### Current implementation constraint

`client/src/features/sync/session.ts` constructs the peer connection with `iceServers: []`. Only host candidates are available; there is no external STUN discovery or TURN relay fallback. Local two-profile Chromium tests do not verify wired-to-Wi-Fi Firefox connectivity.

### Investigation sequence

1. Record browser versions and repeat the same fresh pairing flow with regular Firefox on both devices, private Firefox on both, and Chrome on both.
2. Inspect Firefox's `about:webrtc` reports for local/remote candidate presence, candidate types, `.local` hostnames, and ICE candidate-pair states.
3. Verify offers, answers, and ICE candidates arrive and are applied in the expected order. Do not assume that an ICE failure proves a firewall problem.
4. Add bounded diagnostics for signaling state, ICE gathering/connection state, candidate types/counts, and connection errors. Avoid logging note content, pairing credentials, full SDP, or raw network addresses by default.
5. If discovery/reachability is the cause, evaluate a documented STUN service. STUN helps discover reachable addresses without relaying app content, but cannot resolve every network restriction.
6. Treat TURN relay support as a separate architectural decision, including infrastructure, cost, and the change from direct-only transport.

### Resolution criteria

- Establish and document supported Firefox behavior through repeatable physical-device testing.
- Provide an actionable failure message when direct connectivity is unavailable, without asserting an unconfirmed cause.
- Keep Chrome syncing and explicit peer verification working after any connection changes.

## Verification backlog

- [ ] Populated legacy store → genuinely fresh browser profile, in both initiation directions.
- [ ] Populated sync-aware store → genuinely fresh browser profile.
- [ ] Stale metadata versus visible content across hydration, imports, restores, and older app versions.
- [ ] Archive visibility versus actual deletion/recovery behavior.
- [ ] Regular/private Firefox comparison on two physical devices.
- [ ] Mobile browser and installed-PWA acceptance, including backgrounding and interrupted sessions.
- [ ] Clearer connection diagnostics and user-facing recovery explanations.

Existing automated tests cover conflicting notes, intentional restore deletions, repeated Chromium sync, tab locking/cancellation, and persistence failure. They do not fully cover the reported first-transfer scenario or the Firefox environment.

## When resuming work

Start with SYNC-001's fresh-profile reproduction and preserve evidence before restoring or dismissing conflicts. Update this document with the reproduction, confirmed cause, regression test, fix, and deployed verification result. Until then, keep hypotheses labeled as hypotheses and retain normal export backups.
