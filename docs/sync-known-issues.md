# Known sync issues

**Deferred; causes unconfirmed.** Production Chrome syncing worked between a Windows Ethernet PC and Windows Wi-Fi laptop on the same home network, without VPN/guest Wi-Fi. Frontend/mobile improvements do not establish fixes for these reports.

Setup: [device-sync.md](device-sync.md). Merge rules: [architecture.md](architecture.md#sync-invariants).

## SYNC-001 — Notes unexpectedly required recovery

**Reported:** notes existed on the PC but were not visible on the laptop; after production sync, individual restoration was required on both. The user restored them; original evidence may have changed.

**Expected:** populated device → genuinely fresh device copies notes automatically. Absence alone is not deletion.

**Hypotheses:** prior imports/deletions left tombstones; visible notes disagreed with sync metadata; migration/first-sync classification was wrong; an archived primary hid otherwise preserved content. No hypothesis is confirmed. Do not weaken deletion handling without a reproduction.

**Investigate:**
1. Preserve pre-sync exports and record each production browser's import/deletion/restore history. Preview storage is separate unless data was explicitly moved.
2. Reproduce legacy and sync-aware populated stores → fresh stores, in both initiation directions. Then add archive, deletion, v1/v2 import, empty restore, older-app writes, and repeat sync histories individually.
3. Trace affected IDs, vectors, tombstones, archive state, and recovery provenance through hydration → `ensureSync` → merge → `projectSync` → persistence. Note content is unnecessary in diagnostic logs.
4. Add a regression before fixing. Verify automatic fresh transfer, intentional deletions, concurrent edit recovery, and duplicate-free retries.

**Code:** `client/src/utils/sync/{state,records,validation}.ts`, `client/src/store/useStore.ts`, `client/src/features/sync/RecoveryPanel.tsx`, `client/e2e/sync.e2e.ts`.

## SYNC-002 — Firefox connection failure

**Reported:** Firefox failed between the same Windows PC/laptop; private Firefox was used. Chrome worked. Regular Firefox was suggested but no result was reported; private mode is not a confirmed cause.

**Constraint:** `client/src/features/sync/session.ts` uses `iceServers: []`. Local Chromium peer tests do not establish physical Firefox connectivity.

**Investigate:**
1. Record browser versions and compare regular Firefox, private Firefox, and Chrome under the same network conditions.
2. Inspect `about:webrtc`: local/remote candidates, `.local` hostnames, candidate types, and failed/selected pairs. Verify offer/answer/candidate delivery before blaming the firewall.
3. Add bounded signaling/ICE diagnostics without note content, credentials, full SDP, or raw network addresses by default.
4. Evaluate STUN if discovery/reachability is the cause. TURN is a separate infrastructure/cost/direct-only transport decision.

**Done when:** physical Firefox support/limits are reproducible and documented, failures are actionable, and Chrome plus peer verification remain working.

## Remaining verification

- First-transfer scenarios and stale metadata across restores/older app versions.
- Archive visibility versus deletion/recovery.
- Regular/private Firefox on physical devices.
- Mobile sync backgrounding/interruption and installed-app behavior.

Current automated tests cover conflicting notes, intentional restore deletions, repeated Chromium sync, tab locking, and persistence failure; they do not fully reproduce the reported first transfer or Firefox environment. Record the reproduction, confirmed cause, test, fix, and deployed result here when work resumes.
