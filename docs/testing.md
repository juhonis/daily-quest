# Development, testing, and release

## Local review

From `client`, run `npm ci` then `npm run dev`. Use `http://localhost:5173` on the PC or Vite's Network URL on the phone, normally `http://<PC-IP>:5173`. Use HTTPS if configured by your local TLS setup; Vite does not enable it by default.

LAN testing is the normal UI feedback loop; USB forwarding and Cloudflare previews are optional. Import exported data copies for old/new comparisons. Each origin/port/browser has separate storage, and unfinished drafts are not in exports.

For a built frontend, run `npm run build` then `npm run preview -- --host 0.0.0.0 --port 4173`. Neither Vite mode provides the pairing API; use [local sync development](device-sync.md#local-development) when testing pairing too.

Normal Vite dev does not register the production service worker. Check installation, offline reopening, and updates on the `main` HTTPS preview or another trusted origin serving the build. A plain HTTP LAN IP is not a secure context. Optional USB loopback: `adb reverse tcp:4173 tcp:4173`, then open `http://localhost:4173` on the phone.

## Automated checks

Install dependencies with `npm ci` in both `client` and `sync-worker`.

From `client`:

```bash
npm run test:run
npm run lint
npm run build
npx playwright install chromium firefox
npm run test:e2e
npm run test:android
```

From `sync-worker`:

```bash
npm run check
npm test
npx wrangler deploy --dry-run --env preview
```

- `test:e2e`: complete Chromium suite; starts local Worker/Pages processes on 8787/8788. Keep those ports free.
- `test:android`: focused Chromium mobile/touch and narrow desktop Firefox checks. Firefox cannot emulate Playwright's `isMobile`; its CDP-only drag test is skipped, with move-button coverage retained.
- Coverage includes dates, backups, causal merges, editors/drafts, browser history, keyboard bounds, touch controls, PWA assets/offline behavior, and real browser-to-browser WebRTC. Weather/radar fixtures avoid external-service dependencies.
- Runtime state, traces, and screenshots are ignored under `.wrangler`/`test-results`. Regenerate committed app icons with `npm run icons:generate` after installing Chromium.

## Android acceptance

Primary target: **OnePlus Nord 2T 5G, Android 14**; Chrome, Brave with normal Shields, and Firefox. The user reported successful local mobile use. Exact browser/keyboard/install combinations still need to be checked during the release trial; automated engine/layout results are not physical-device certification.

- Back hides the keyboard, then closes the top dialog, then returns through app views; root Day exits normally. Declining discard preserves content.
- Save/Cancel/X and reader-to-editor handoffs leave no empty Back steps. Drafts recover after reload/backgrounding.
- With the keyboard open, Save and the focused field stay reachable. Check portrait/landscape, address-bar changes, gesture-navigation spacing, and normal/larger text settings.
- Scrolling does not reorder panels accidentally. Long-press drag, move buttons, visibility, and merge/unmerge work.
- Calendar, forecast, radar, code, and table scrolling remain usable. Work can continue with radar open.
- On a trusted production build, exercise each browser's available install/home-screen flow, offline reopen/save, and explicit update Reload. Firefox's launch/install presentation may differ from Chromium.

## Release flow

```text
feature branch → v2 → main (preview trial) → prod
```

1. Review changes locally, run relevant checks, then merge feature PRs into `v2`. Merge regular `main` fixes back into `v2` as needed.
2. Promote accepted `v2` to `main`; test the built app on `https://main.daily-quest-dmt.pages.dev` with data copies.
3. Check editing, draft recovery, Back, export/import, installed/offline behavior, and physical two-device sync. Deferred sync findings are in [sync-known-issues.md](sync-known-issues.md).
4. For Worker/protocol changes, deploy the compatible Worker first. Frontend-only releases need no Worker redeploy. Promote `main` to `prod` when satisfied.

Pages build settings: root `client`, command `npm run build`, output `dist`, Node 22.12+ or a supported newer release. The Worker workflow deploys changes under `sync-worker`/its workflow on `prod`, or by manual dispatch. Configuration: [device-sync.md](device-sync.md#cloudflare-deployment).
