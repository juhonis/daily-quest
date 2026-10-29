# Frontend reference

## Workspace

| View | Purpose |
|---|---|
| Day | Selected date, current weather/hourly forecast, actionable tasks and completions |
| Notes | Search, read, edit, and archive notes |
| Library | Find quests across dates; filter active, parked, archived, or completion history |

- Desktop uses a collapsible calendar sidebar; smaller screens use bottom navigation and a date dialog.
- Calendar scrolling does not select a date. Today and keyboard arrows/month controls remain available.
- Task List is the default; Board is available on larger screens. Layout selection resets on reload. Empty sections and Done are collapsed initially.
- Customize controls visibility, order, and merges. Use move buttons or hold a touch handle briefly to drag.
- Browser history restores views and closes the top dialog first. A declined discard keeps the editor open. Reload restores the view, not transient dialogs.

## Quest editor

- Title and Schedule are primary. Description, Subquests, Tags, and More options expand inline.
- New quests default to **Once**, carry-forward off. Repeat supports daily, weekly, monthly, or a positive whole-number custom interval.
- **Carry forward until completed** is explicit. **Park for later** saves an inactive quest outside the calendar; schedule it later from Library.
- Archived edits preserve archive state and scheduling. Editing preserves IDs, creation dates, advanced metadata, and existing subquest completion flags.
- A nonempty New step field is included on save. Tag queries are attached only after choosing/creating a tag or pressing Enter.
- **Settings → Manage quest tags** owns global rename, delete, and color actions. Unsaved editor tag choices do not mutate saved data.
- Quick add presets store title/link/icon, not the full schedule. Timing is selected when using a preset. XP remains metadata only.

## Notes

- Search matches all query words across title, Markdown source, and tags; tag filters match any selected tag. Both apply in Active and Archived.
- Recently updated is the default sort; creation date and title sorts are available.
- Appearance switches Subtle/Colorful cards without changing stored note colors. The choice is local to the browser/origin.
- Write/Preview share the Markdown renderer. Ctrl/Cmd+B/I formats selections; Ctrl/Cmd+Enter saves. Enter continues lists/quotes and exits empty items.
- Note bodies retain indentation and trailing newlines. Editing preserves identity, creation date, custom colors, and archive state.
- Readers follow live note IDs. Removed notes show unavailable; an editor whose source disappears can explicitly save a fresh-ID copy.
- Archive deletion targets only the shown results, with a count and confirmation.

## Local drafts

- Quest/note drafts autosave after 300ms and flush on backgrounding/page hide. **Keep draft** saves and closes; reopen New or edit the same item in the same tab to resume.
- Save or confirmed discard clears the draft. A changed source requires an explicit recovery choice before applying an older draft.
- Drafts are per-tab, survive reload, and are **not** exported or peer-synced. Clearing site/session storage removes recovery. There is no standalone browser for drafts tied to already-deleted items.
- Failed/oversized writes are reported; saving the actual item remains available if application storage works. Limit: one million JSON characters per draft.

## Weather and radar

- The day header combines date, current temperature/time, and compact location. **Now** distinguishes current conditions when another date is selected; hourly data follows the selected date.
- Open-Meteo requests are cached/deduplicated for ten minutes. The UI requests dates within the past 92/next 16 days; API availability can be narrower. Loading, retry, and unavailable states are explicit.
- Radar uses RainViewer frames over OpenStreetMap standard raster tiles in Leaflet, with visible provider credits. Tiles use normal browser caching; no prefetch/offline map cache. At 1440px+, it occupies a 320px sticky right column; otherwise it is inline below the page header.
- Radar stays open across views without blocking work. Resizing preserves map view, frame, and playback. Wheel zoom is disabled; Escape closes only when focus is inside the panel.
- Metadata, background-map tiles, and rain-overlay tiles have separate retry states. Failed overlay tiles pause playback; retry keeps the map view and selected frame.

## Mobile/PWA

- Notes use full-screen readers/editors below 640px. Dialog actions stay outside the scroll body; visual-viewport handling keeps fields/actions accessible above keyboards.
- Safe areas, touch-sized controls, and move-button alternatives support Android use.
- Manifest start URL, scope, and app ID are `/`; 192/512px and maskable icons are generated from `client/public/app-icon.svg`.
- Updates require Reload; notices wait until dialogs close. Saved notes/quests work offline after caching; weather, radar, and pairing require network access.

Local testing and remaining release checks: [testing.md](testing.md). Deferred transport/merge findings: [sync-known-issues.md](sync-known-issues.md).
