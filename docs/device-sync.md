# Device sync

Manual sync combines two open browsers over encrypted WebRTC. Cloudflare stores temporary pairing information, not notes/tasks. Production PC/laptop syncing has worked in Chrome; [reported issues](sync-known-issues.md) remain deferred.

## Pair devices

1. Open production or the stable main preview on each device, preferably on the same non-guest network. Both sites share pairing; their browser storage remains separate.
2. First device: **Settings → Sync devices → Start sync**.
3. Second device: enter the eight-character code and choose Join sync. QR links open the initiating site's origin; to sync data already stored on the other site, keep that site open and enter the code there.
4. Compare verification codes; confirm **Codes match — sync** on the first device.
5. Keep both apps open until both show **Sync complete**. Alternate edits are under **Settings → Sync recovery**; restore replaces the current version, dismiss removes the recovery item.

Only one tab per browser profile can sync at once. Both devices need internet for pairing. The app uses host ICE candidates only: no STUN, TURN, or relay. Same-network connectivity is not guaranteed, and cross-network use is not a supported expectation.

Sync includes quests/subquests, notes, completions, presets and their overrides, tag colors, and recovery records. Layout, location, filters, selected date, appearance, drafts, and active replica identity remain device-local. For merge/restore rules, see [architecture.md](architecture.md#sync-invariants).

## Cloudflare deployment

| Environment | App origin | `SYNC_SERVICE` Worker |
|---|---|---|
| Production (`prod`) | `https://daily-quest-dmt.pages.dev` | `daily-quest-sync` |
| Main preview | `https://main.daily-quest-dmt.pages.dev` | `daily-quest-sync` (shared with production) |
| Local Pages | `http://localhost:8788` | Local preview Worker |

- Pages settings: root `client`, build `npm run build`, output `dist`. GitHub integration deploys `prod` to production; other enabled branches are previews.
- `client/wrangler.jsonc` routes deployed production/preview Pages to the shared Worker; `npm run dev:sync` explicitly uses the local preview Worker. Deploy Functions with the source, not `dist` alone. Only `/api/sync/*` invokes Functions; Pages handles static assets and SPA fallback.
- `sync-worker/wrangler.jsonc` defines a separate Worker with a **SQLite-backed Durable Object**, hibernatable signaling WebSockets, and expiry cleanup. Deploy it before the first Pages build referring to its binding. No separate app-content database is required.
- `workers_dev: false` is intentional: access is through the Pages service binding.

From `sync-worker`:

```bash
npm ci
npx wrangler login
npm run deploy -- --env preview   # Preview Worker
npm run deploy -- --env ""        # Production Worker
```

Use the same Cloudflare account as Pages. Deploy the intended environment, not both by default. For shared preview/production pairing, deploy the production Worker's updated origin allowlist first, then redeploy preview Pages with the shared binding. The production Pages frontend does not need updating for this configuration change.

### Origins and previews

`ALLOWED_ORIGINS` must contain the exact browser origin, without trailing slash/path. Top-level vars allow production and the stable main preview on the shared Worker. `env.preview.vars` applies to the separate development Worker, including localhost 5173/8788.

Use stable branch aliases rather than deployment hashes; `feat/example` becomes `feat-example.daily-quest-dmt.pages.dev`. Other deployed preview aliases are not allowed by default; add an intended alias to the shared Worker's top-level allowlist and redeploy the **production Worker** to enable sync there. Local/development Worker rooms remain separate from the shared service.

Production ↔ main preview sync is the same two-way merge as same-site sync: preview edits and deletions can return to production. Compatible sync protocols are required across versions; current main/prod share the protocol and record schema.

| Change/error | Action |
|---|---|
| Worker code or `ALLOWED_ORIGINS` changed | Redeploy that Worker environment |
| Pages binding or frontend changed | Redeploy Pages via GitHub |
| `Origin not allowed.` | Check the actual URL, allowlist, and preview/production binding |
| Cloudflare email access screen | Pages preview Access policy; separate from pairing |
| Direct connection failed | Check browser/ICE diagnostics; see [known issues](sync-known-issues.md#sync-002--firefox-connection-failure) |

The GitHub workflow `.github/workflows/sync-worker.yml` checks/deploys Worker changes on `prod`, or supports manual preview/production dispatch. It requires Actions secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` with Worker deployment permissions. Pages deploys independently; deploy a new Worker protocol first and keep rollout compatible.

## Local development

Install dependencies in both packages. From `sync-worker`, run:

```bash
npm run dev -- --env preview
```

In a second terminal, from `client`:

```bash
npm run build
npm run dev:sync
```

Open `http://localhost:8788`; use `localhost` to match the allowlist. Rebuild after frontend edits. Ordinary Vite dev and Docker serve no pairing API. Physical-device WebRTC requires a trusted secure origin; see [testing](testing.md#local-review).

## Limits

| Limit | Value |
|---|---|
| Pairing lifetime | Five minutes, two peers, single-use code |
| Creation/join/socket attempts | 30 per source IP per ten minutes |
| Sync payload | 8 MiB, 20,000 records |
| Per-record metadata | 100 revision heads, 1,000 replica entries per vector |

localStorage may fill before protocol limits. Incomplete transfers/persistence failures are retryable; sync is not a substitute for export backups. Pre-tracking deletions cannot be inferred on first sync.

Workers Free supports SQLite-backed Durable Objects; account quotas apply. Pricing: [Workers](https://developers.cloudflare.com/workers/platform/pricing/) · [Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/).

Verification commands: [testing.md](testing.md#automated-checks).
