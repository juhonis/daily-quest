# V2 frontend experiment

## Branch and review flow

- `v2` is the experimental integration branch, initially copied from `main`.
- The first working prototype is on `feat/v2-layout-prototype`.
- Feature PRs target `v2`. Local review with imported real-data copies is the current feedback loop; a Pages preview is optional for remote/device testing.
- Adoption remains a separate decision: `v2` → `main` → `prod` after review and acceptance.
- Bring regular fixes from `main` into `v2` periodically with a merge.

## Design direction

Keep the dark slate palette, blue primary actions, rounded surfaces, and existing personal tag/note colors. Reduce competition between weather, navigation, management controls, and actual content. Desktop and mobile share the same feature components and data; layout and interaction adapt to available space.

The first prototype uses real application data and actions. Sample quests and notes exist only in browser tests, not in the shipped UI.

## First slice: responsive layout prototype

### Navigation and hierarchy

- Separate **Day**, **Notes**, and **Library** destinations.
- Desktop navigation sits in the header; phone/tablet navigation sits at the bottom, with **More** opening Settings.
- A contextual **New quest / New note** action is always available in the header.
- Date, time, location, and current conditions form one Day summary. The selected day's hourly forecast is always visible alongside it on wide screens and below it on phones. Radar and location settings open on demand.
- Calendar is an optional desktop sidebar. Hiding it releases its grid column.
- On smaller screens, tapping the date opens a calendar dialog.

### Day workspace

- Grouped list is the initial presentation, with a **List / Board** comparison toggle on larger screens.
- Board columns have a usable minimum width and wrap; narrow screens stack groups.
- Empty list sections collect under a collapsed disclosure. Done starts collapsed when populated.
- Filters and tag-section creation are behind one Filters action; layout management lives under Customize.
- Existing panel order, visibility, merges, and tag colors are retained.
- Completion progress is shown for the selected date.

### Task and editing interactions

- Task titles are real buttons that open details on click, tap, or keyboard activation.
- Edit, external links, and deletion are available from details rather than hover-only controls.
- Subquests can be expanded from a compact steps summary.
- Quest creation/editing uses a viewport-bounded dialog, without the old absolutely positioned history panel overlapping the form.
- Discarding an edited quest or note asks for confirmation; saving closes the editor.
- The next slice, [V2 quest editor](v2-quest-editor.md), focuses the form on title/scheduling, adds inline optional sections and local draft recovery, and moves global tag management to Settings.

### Notes and Library

- Notes retain their existing colors and Markdown editor. Card grids respond to their container width.
- Note cards have keyboard-accessible reading buttons and visible archive actions.
- Note reading/editing uses the shared responsive dialog; the formatting toolbar has larger touch targets.
- Library provides search, active/parked/archived filters, and completion-history filters for the selected date, current week, or last 30 days.
- Library opens the same task details/editor, without checkboxes that could accidentally modify a different date's completion history.

### Shared foundations

- Common buttons and task checkboxes have larger interaction areas and visible focus indicators.
- Native modal dialogs provide top-layer stacking, background inertness, focus containment, Escape handling, and focus restoration. Nested cancellation is scoped to the top dialog.
- Default dialogs are bounded by the dynamic viewport and have a scrollable body.
- Mobile navigation includes bottom safe-area padding; mobile inputs use a readable size without Safari's small-input zoom.
- The calendar shows multiple months in a naturally scrolling sidebar or date dialog, emphasizes the selected month, and moves actual keyboard focus between days and months.

## Deliberate prototype choices

- List/Board selection is local component state and resets on reload. Decide whether to persist it after comparing the layouts.
- Navigation screens are local UI state, not browser routes yet.
- The old right-column dashboard and create-tab navigation are not rendered in the new shell. Library and shared editing cover their main workflows; the legacy components remain available for reference during the experiment.
- Following the first review, multi-month scrolling replaces the single-month picker. Seven months are initially rendered; the buffer extends near either end and stays bounded at thirteen months. Visible-month anchoring prevents jumps when prepending or trimming.
- The inline header uses available container width rather than just viewport breakpoints. Date and current conditions share one block, without a divider between them; only the hourly forecast is separated. Temperature and time share a line, with a compact city name below and the full location available in its tooltip and location settings. **Now** appears when viewing a date other than today; the hourly strip labels the selected date.
- Weather requests are deduplicated/cached for ten minutes, with explicit loading/error/retry states and no stale forecast carried into a different date or location.
- No storage schema or sync merge-rule changes are included. The shared sync dialog still opens from Settings or QR join links.

### Non-modal radar dock

- The weather header's radar button toggles a workspace panel; it does not lock scrolling or make the rest of the page inert.
- At 1440px and wider, the panel occupies a 320px right-hand column and sticks below the app header. Closing it releases the column.
- Below that breakpoint, the panel is an inline card between the current page header and its content, with a shorter map.
- The panel stays open across Day, Notes, and Library. Tasks can be completed or edited and notes browsed while it remains open.
- The same Leaflet instance stays mounted across responsive layout changes. Resize observation updates its dimensions while preserving the zoom, center, selected frame, and playback state.
- Playback and frame selection use touch-sized controls. Scroll-wheel zoom stays disabled.
- Radar loading failures have an explicit Retry action. Location settings are still a dialog, scoped independently from the dock.
- Close returns focus to the radar trigger when Day is visible, or to the workspace when another screen is active. Escape closes the panel only when focus is inside it, so it does not intercept unrelated editor/location dialogs.

## Verification

From `client`:

```bash
npm run test:run
npm run lint
npm run build
npm run test:e2e
```

Install the Chromium Playwright browser first if needed: `npx playwright install chromium`. The existing browser-test configuration starts local Pages and Worker processes on ports 8788 and 8787.

New browser coverage includes:
- Actual calendar-column removal, List/Board switching, and Library editing.
- Touch-emulated phone editing/completion and note creation/reading.
- Completion-history filtering without accidental task completion controls.
- Calendar arrow/month navigation moving DOM focus.
- Multi-month wheel scrolling without changing the selected date or moving the page, including anchor preservation when earlier months are added.
- Always-visible weather, shared current-day requests, selected-date forecasts, out-of-range dates, retry, and location dialogs.
- Non-modal radar task completion/editing/navigation, inline/docked bounds, resize preservation of map pan/zoom/frame/playback, retry, and close/focus behavior. Radar metadata and tiles are mocked so these checks do not depend on external weather services.
- Nested dialog Escape behavior and focus restoration.
- Unsaved quest draft cancellation.
- Viewport/editor bounds at 320px, 768px, and 1280px.

The existing peer-sync browser tests remain part of the same suite. Review screenshots are written to ignored Playwright test artifacts for the desktop and phone views.

## Review before the next slice

1. Compare List and Board with a realistic number of quests and tags.
2. Compare the restored multi-month scrolling with the original, especially browsing without selecting and returning to Today.
3. Check the inline date/weather container with your location and typical laptop/phone widths.
4. Test the actual target phone/browser, especially editing with the onscreen keyboard, portrait/landscape, safe areas, and installed-PWA behavior.
5. Confirm search/history and panel customization cover the workflows previously used in the sidebars.
6. Try leaving radar open while planning and browsing notes; compare its right-hand dock with the inline placement on smaller windows.

Preview origins have separate browser storage. Use sample data or an imported copy of an export for review. To test peer sync on the stable v2 preview, its exact origin must be included in the preview Worker's allowed origins and that Worker redeployed.

## Follow-up slices

- Refine the accepted shell into a consistent design system and tune desktop density.
- Review the focused quest editor and its local draft recovery with real data; touch panel reordering remains part of mobile polish.
- Develop Notes search, quieter color treatments, reading/editor layouts, and draft persistence.
- Further polish weather/radar presentation and radar-specific unavailable/retry behavior.
- Complete mobile browser/PWA acceptance, app icons, browser-back behavior, and keyboard handling.
- Add visual regression baselines after the design stabilizes.

Sync investigation remains deferred in [sync-known-issues.md](sync-known-issues.md).
