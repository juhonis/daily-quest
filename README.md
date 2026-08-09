# Daily Quest

A calendar, todo, and note-taking app that runs entirely in your browser — no account, no backend, works offline.

**Live demo:** <https://daily-quest-dmt.pages.dev/>

## The original idea: gamification

Daily Quest started as an idea to turn the daily todo list into a game — earn **XP** for completing quests and spend it on **rewards**.

That gamification layer is **not implemented yet** and may never be. The current app is the core foundation: a flexible calendar + quest (todo) + notes app. The data model reserves an optional `xp` field on each quest for a future scoring system, but today there is no XP collection, no levels, no streaks, and no rewards — just the (already useful) task and calendar tooling.

## Features

- **Calendar** — month grid with keyboard navigation; click any date to plan that day; quick "jump to today".
- **Quests (todos)** — create tasks with optional description, external URL, and icon.
  - **Repeat rules** — none, daily, weekly, monthly, or custom intervals (e.g. every 3 days).
  - **Rollover** — carry an incomplete quest forward every day until you finish it (never auto-expires).
  - **Sub-quests** — checklists inside a quest.
  - **Quick-add presets** — one-tap quests like Wordle, NYT Mini, Connections; create your own presets.
  - **Tags** — color-coded tags, tag filtering, and dedicated tag panels.
- **Panel system** — quests are grouped into panels (daily, repeating, important, rollover, done, per-tag). Panels can be shown/hidden, merged, and reordered via drag & drop.
- **Per-day completions** — checking off a quest records it for that specific date only; repeating quests are completed independently each day.
- **Notes** — markdown notes with colors and tags, fully searchable/archivable.
- **Weather** — current conditions, hourly forecast, and a rain radar for the selected date (Open-Meteo + Open-Meteo radar, no API key needed). Uses auto-geolocation or a manual location.
- **Data backup** — export all data as a versioned JSON file and restore it (with a forced backup gate) from Settings.
- **PWA / offline** — installable to the home screen, cached service worker, works without a connection.

## How it works

- **Local-first.** All data is stored in your browser's `localStorage` under the key `daily-quest-store`, managed by Zustand with the `persist` middleware. There is no server, no database, and no user account.
- **Timezone-safe dates.** Everything is stored as plain `YYYY-MM-DD` strings. "Today" is always your local calendar day, so nothing shifts when you travel or cross midnight. All date math lives in `src/utils/dateUtils.ts` using `date-fns`.
- **Data ownership.** Because everything is local, your data never leaves your device unless you export it. Use the **Settings → Export** feature to back up or move your data between browsers/devices.

## Tech stack

| Layer | Tech |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Build | Vite 8 |
| State | Zustand 5 (`persist` → `localStorage`) |
| Dates | date-fns |
| Notes | react-markdown, remark-gfm |
| Weather | Open-Meteo, Leaflet |
| PWA | vite-plugin-pwa (service worker) |
| Tests | Vitest |
| Lint | ESLint |

## Local development

```bash
cd client
npm install
npm run dev
```

Open <http://localhost:5173>.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once |

## Deployment

### Cloudflare Pages (production)

The app is a static SPA and is currently deployed to Cloudflare Pages at <https://daily-quest-dmt.pages.dev/>.

To deploy:

1. Build the client: `cd client && npm run build` — the output lands in `client/dist`.
2. Push `client/dist` (e.g. via a GitHub repo connected to Cloudflare Pages, build command `npm run build`, output directory `dist`).
3. SPA fallback is handled by the existing `client/public/_redirects` file (`/* /index.html 200`), which Cloudflare Pages picks up automatically.

### Self-hosting with Docker

#### Production

Build the multi-stage image (Node build → nginx serve, port 80):

```bash
docker build -t daily-quest ./client
docker run -p 8080:80 daily-quest
```

Open <http://localhost:8080>. The nginx config handles SPA routing, the PWA service worker, and long-lived caching for hashed assets.

#### Development (hot reload)

The root `docker-compose.yml` runs the Vite dev server with file watching enabled for container volumes:

```bash
docker compose up
```

Open <http://localhost:5173>.

## Project structure

```
.
├── client/               # The React/Vite SPA (all application code)
│   ├── src/
│   │   ├── components/   # Shared UI and layout components
│   │   ├── features/     # Feature modules: calendar, quests, notes, weather, settings
│   │   ├── store/        # Zustand store (useStore.ts)
│   │   ├── types/        # Global TypeScript types
│   │   └── utils/        # Pure helpers (dateUtils, exportImport, cn)
│   ├── public/           # Static assets, PWA manifest, _redirects
│   └── Dockerfile        # Production build (nginx) + dev deps target
├── docs/                 # Design and planning documents
└── docker-compose.yml    # Dev compose setup (hot reload)
```

## Testing

```bash
cd client
npm run test:run
```

Tests cover the two highest-risk areas: recurring-quest date logic (`src/utils/dateUtils.test.ts`) and the export/import validator, including roundtrips and security guards (`src/utils/exportImport.test.ts`).

## Roadmap

Planned and designed but **not yet built**:

- **Gamification** — the original concept: XP accumulation, levels, streak tracking, and a rewards system. The `xp` field is already reserved on quests and surfaced in the UI as metadata, but no game mechanics exist yet.
- **Cloud sync** — optional Google sign-in with Firebase/Firestore, keeping the app local-first and anonymous by default, with last-write-wins sync. Fully specced in `docs/storage-plan.md`, not implemented.

See the `docs/` folder for the design history: `plan.md`, `structure-rules.md`, `storage-plan.md`, `weather-plan.md`.

## License

[MIT](LICENSE)
