# Device sync setup

Daily Quest can manually combine data between two open browsers. Cloudflare coordinates temporary pairing; notes, quests, completions, presets, and tag colors travel directly over an encrypted WebRTC data channel.

Known production findings and deferred investigation steps are tracked in [sync-known-issues.md](sync-known-issues.md).

## Using sync

1. Open the app on both devices, preferably on the same non-guest Wi-Fi.
2. On the first device, select **Settings → Sync devices → Start sync**.
3. On the second, enter the eight-character code under **Join sync**, or scan the QR with the device's camera and open the link.
4. Compare the verification code displayed on both devices. If it matches, select **Codes match — sync** on the first device.
5. Keep both apps open until **both** show **Sync complete**.

Alternate versions are listed under **Settings → Sync recovery**. Expand an item to inspect it, then restore or dismiss it. Restoring intentionally replaces the current version of that item. Recovery actions propagate at the next sync.

Only one tab per browser profile can run a sync session at a time. Cancelling or closing the sync dialog releases that lock.

## First Cloudflare deployment

The frontend continues using GitHub → Cloudflare Pages. The pairing Worker is deployed separately. **Deploy the Worker before the first Pages deployment containing the new binding.**

### 1. Check the configuration

- `client/wrangler.jsonc`: Pages project name defaults to `daily-quest-dmt`; production `SYNC_SERVICE` targets `daily-quest-sync`.
- `sync-worker/wrangler.jsonc`: production `ALLOWED_ORIGINS` defaults to `https://daily-quest-dmt.pages.dev`. Add any actual custom app origins as comma-separated HTTPS origins, without trailing slashes.
- The Durable Object uses `new_sqlite_classes`, which is supported on Workers Free. There is no separate database provisioning step.

### 2. Deploy the Worker

In `sync-worker`:

```bash
npm ci
npx wrangler login
npm run check
npm test
npm run deploy
```

Select the same Cloudflare account as the Pages project. `workers_dev: false` leaves the Worker reachable through its service binding rather than a public workers.dev URL.

### 3. Deploy Pages through GitHub

Check the existing Pages project build settings:

| Setting | Value |
|---|---|
| Root directory | `client` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 22.12+ (or a supported newer version) |

Push the branch to GitHub and deploy the intended production commit through the existing integration. Pages discovers `client/functions` relative to the project root; uploading `dist` alone does not deploy these Functions.

The Wrangler configuration declares `SYNC_SERVICE` as a service binding. Verify it in **Pages → Settings → Bindings**, targeting `daily-quest-sync` in production, and redeploy if you change it. Only `/api/sync/*` invokes Functions; static assets remain static.

Pages' built-in SPA fallback serves the frontend. The old wildcard `_redirects` rule was removed because Wrangler rejected it as an infinite rewrite loop. The service worker excludes API navigations from its app-shell fallback.

### 4. Optional GitHub Worker deployments

`.github/workflows/sync-worker.yml` runs Worker checks/tests and deploys production when Worker files change on `main` or `master`. It also supports manual dispatch for production or preview.

Add these repository Actions secrets:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` with permission to deploy Workers in that account (Cloudflare's **Edit Cloudflare Workers** template can be used).

This workflow does not deploy Pages; the existing Pages GitHub integration handles that. Separate integrations do not guarantee deployment ordering: deploy a new Worker protocol before releasing a frontend that requires it, and keep subsequent protocol changes backward-compatible during rollout.

## Preview isolation

The Pages preview binding targets a separate `daily-quest-sync-preview` Worker and Durable Object namespace.

1. Add the exact branch-preview origin you intend to use to `env.preview.vars.ALLOWED_ORIGINS` in `sync-worker/wrangler.jsonc`. Defaults allow only local development.
2. In `sync-worker`, run:

   ```bash
   npm run deploy -- --env preview
   ```

3. Verify Pages' **Preview** service binding targets `daily-quest-sync-preview`, then redeploy the preview.
4. Open the same allowed preview URL on both devices. Production codes cannot join preview sessions or vice versa.

## Local development

Install dependencies in both `client` and `sync-worker` with `npm ci`.

In one terminal, from `sync-worker`:

```bash
npm run dev -- --env preview
```

In another terminal, from `client`:

```bash
npm run build
npm run dev:sync
```

Open **http://localhost:8788**. Pages dev connects its service binding to the local Worker on port 8787. Use `localhost`, rather than `127.0.0.1`, to match the configured allowed origin. These commands do not deploy to Cloudflare.

`npm run dev` still runs the normal Vite frontend, but does not run the pairing service. Rebuild and refresh Pages dev when changing frontend code. HTTPS is required for real devices; ordinary HTTP LAN addresses are not secure browser contexts.

## Verification

From `client`:

```bash
npm run test:run
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

From `sync-worker`:

```bash
npm run check
npm test
npx wrangler deploy --dry-run
```

The Playwright tests launch local Worker and Pages processes, use isolated browser profiles and a per-run local Worker registry/storage directory, and exercise actual Chromium WebRTC connections. Ports 8787 and 8788 must be available. Test artifacts and local runtime data are gitignored.

Automated coverage includes causal merging, first-sync legacy conflicts, deletions, restores, validation, checksummed chunk transfer, pairing/authentication, rate limiting, expiry cleanup, verification gating, persistence acknowledgements, repeated browser syncs, and cross-tab sync locking/cancellation.

Before considering production setup complete, verify on two physical devices:
- Enter a code and scan a QR join link; compare verification values.
- Edit different items offline, reconnect, and confirm both devices receive them.
- Edit the same note independently and inspect its recovery version.
- Delete an item and uncheck a task; sync and verify stale copies stay removed.
- Interrupt a transfer and retry; verify no duplicate notes or recovery items.
- Check installed PWA and normal-tab behavior, including an unavailable pairing service.

## Storage and conflict behavior

- Each record carries causal version vectors. A fresh replica ID per tab/load prevents copied identities and counter collisions; counters advance per record. Existing content gets a deterministic SHA-256-derived legacy root so differing unsynced content has distinct ancestry.
- Concurrent notes, quests, and presets retain alternate content in stable recovery records. Concurrent deletion hides the original and preserves edited content for recovery. Completion identity is `(questId, date)`; concurrent unchecked state wins until a later deliberate re-check.
- Tag colors resolve deterministically per tag. Layout, filters, selected date, and weather settings stay device-local.
- Sync uses two snapshot rounds. Edits made during the first round are caught by the second; edits made during the final round may require another sync, which the result indicates.
- Backups now use schema v2 and include revisions, tombstones, and recovery items. Schema-v1 imports still work. Restores create new causal changes while retaining historical content timestamps; active device identity is never copied from a backup.
- Deletions made before sync tracking was installed cannot be inferred on first sync.
- Tombstones are retained; sync metadata grows with usage. Transfers are limited to 8 MiB, 20,000 records, 100 heads per record, and 1,000 replica entries per revision. Browser localStorage may fill sooner. Storage failures mark the session incomplete; export a backup before clearing any browser data.
- Sync is not a replacement for backups: it propagates deletions, and Cloudflare has no copy of app content to restore.

## Connectivity and free-tier limits

The first version uses host ICE candidates only: **no external STUN or TURN services and no data relay**. Same-Wi-Fi connections can fail due to guest isolation, firewall rules, VPNs, or browser privacy behavior. Cross-network connectivity is not guaranteed. Both apps need internet access for pairing and must remain open during sync.

Sessions expire after five minutes. Creation, joining, and WebSocket connection attempts share a limit of 30 requests per source IP per ten minutes; wait or start a new session if limited. Credentials expire with the session; the Worker stores only temporary pairing state and uses WebSocket hibernation.

Workers Free supports this setup. Current allowances and links are recorded in [storage-plan.md](storage-plan.md#32-cloudflare-architecture-and-cost); account usage elsewhere shares those limits. No production resources have been provisioned by the local tests.
