# Daily Quest

A local-first calendar, task manager, and Markdown notes app. No account required; saved tasks and notes work offline. Optional manual sync transfers content directly between devices over encrypted WebRTC.

**Published app:** <https://daily-quest-dmt.pages.dev/> · Production follows `prod`; this README describes the current branch.

## Features

- **Day:** scrollable multi-month calendar, List/Board task layouts, filters, customizable sections, and per-day completions.
- **Quests:** one-off or recurring schedules, carry-forward, parked ideas, subquests, tags, links, and Quick add presets.
- **Notes:** title/content/tag search, sorting, archive, Subtle/Colorful cards, Markdown editing and preview.
- **Editors:** local draft recovery, fixed action footers, and full-screen notes on phones.
- **Weather:** Open-Meteo current conditions/hourly forecasts and an optional RainViewer/Leaflet radar dock.
- **Data:** versioned JSON export/import, direct device sync, and recoverable conflicting edits.
- **Mobile/PWA:** Back navigation, touch reordering, install icons, offline caching, and explicit-reload updates.

XP is optional metadata only. Scoring, levels, streaks, and rewards are not implemented.

## Development

Requires Node.js 22.12+ or a supported newer release, and npm.

```bash
cd client
npm ci
npm run dev
```

Open <http://localhost:5173>. For phone UI testing, use Vite's Network URL, normally `http://<PC-IP>:5173`; HTTPS requires separate TLS configuration. See [testing](docs/testing.md) for production-build/PWA checks.

**Stack:** React 19, TypeScript, Tailwind CSS 4, Zustand, date-fns, Vite 8, Vitest, Playwright; Cloudflare Pages/Workers for pairing.

## Documentation

| Guide | Contents |
|---|---|
| [Frontend](docs/frontend.md) | Current UI, editing, drafts, mobile behavior |
| [Architecture](docs/architecture.md) | State, date rules, backups, sync invariants, code map |
| [Testing](docs/testing.md) | Commands, LAN/mobile testing, release checks |
| [Device sync](docs/device-sync.md) | Pairing, Cloudflare setup, local service, limits |
| [Known sync issues](docs/sync-known-issues.md) | Deferred bugs and investigation steps |

## Checks

From `client`:

```bash
npm run test:run
npm run lint
npm run build
npx playwright install chromium firefox
npm run test:e2e
npm run test:android
```

Browser tests also require `npm ci` in `sync-worker`. Details and Worker checks are in [testing](docs/testing.md).

## Release flow

```text
feature branches → v2 → main (preview trial) → prod (production)
```

The frontend rework has been locally reviewed on desktop and Android. Sync is deployed and has worked between physical PC/laptop browsers; [known issues](docs/sync-known-issues.md) remain deferred. Continue normal testing on `main` before promoting to `prod`.

Cloudflare Pages uses GitHub integration: project root `client`, build `npm run build`, output `dist`. Only `/api/sync/*` invokes Pages Functions. The pairing Worker has a separate deployment; see [device sync](docs/device-sync.md#cloudflare-deployment).

## Docker

From the repository root:

```bash
docker compose up                          # Development: localhost:5173
docker build -t daily-quest ./client
docker run -p 8080:80 daily-quest           # Built frontend: localhost:8080
```

Docker serves the frontend; the Cloudflare pairing API is not included.

## License

[MIT](LICENSE)
