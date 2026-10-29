# V2 notes workspace

Branch: `feat/v2-notes-workspace`, based on the accepted quest editor in `v2`. Feature PRs target `v2`; review locally with a copy of real data before merging.

## Workspace

- Search matches case-insensitive words across titles, Markdown source, and tags. All words must match somewhere in the note.
- Active and Archived are explicit scopes with counts. Search, sorting, and selected tag filters work in both scopes; filters are not silently hidden in Archive.
- Tag filtering matches any selected tag. A result count and Clear search and tags action explain empty results.
- Recently updated is the default sort. Newest created, Oldest created, and Title A–Z are available.
- Creating a note returns to Active and clears search/tag filters so the saved note can be found. Editing preserves the current workspace filters.
- Archived notes can be restored individually. Bulk deletion targets only the shown archived results, with an explicit count and confirmation; clear filters to target the full archive.

## Card colors

- **Subtle** is the default: dark cards with the note's original color as a top accent, quieter previews, tags, and update dates.
- **Appearance → Colorful** restores fully colored cards for comparison. Foreground text is selected for readability; palette contrast is covered by unit tests.
- The choice persists under `daily-quest-notes-appearance` for this browser/origin. It does not edit note colors, timestamps, or synced content.
- Card titles/previews are keyboard-accessible reading buttons; Archive/Restore actions have visible touch-sized targets.

## Reader and editor

- The reader uses a comfortable text width and larger Markdown typography, with bounded horizontal scrolling for code and tables.
- The editor retains Markdown source editing, formatting controls, and list continuation. Write and Preview switch between source and rendered content.
- Ctrl/Cmd+B and Ctrl/Cmd+I format selections; Ctrl/Cmd+Enter saves. Enter continues lists and quotes, and exits an empty list item. Headings do not repeat automatically on Enter.
- Formatting does not submit the note. Title is required; a title-only note is allowed.
- Note bodies are saved exactly, including indentation and trailing newlines. Existing IDs, creation dates, custom colors, archive state, and other metadata are preserved while editing.
- Tags and color are grouped behind one secondary control. Tag suggestions include existing note tags; creating/selecting tags affects only the editor until Save.
- Reader and editor are full-screen below 640px, with fixed dialog headers/footers and a scrollable body. Save remains outside the scrolling form body.
- Actual Android/iOS virtual-keyboard and installed-PWA behavior still require physical-device review; browser coverage uses touch and short-viewport emulation.

## Live data and deletion

- Readers track note IDs rather than keeping a frozen note object. Changes from another tab are reflected in the open reader.
- If the note is removed, the reader shows Note unavailable instead of displaying stale text.
- If a note is removed while its editor is open, the editor offers **Save as new note**. That creates a fresh ID rather than reviving the deleted record.
- Archived content can be edited without implicitly restoring it. Restore and permanent deletion remain explicit actions.
- Peer-sync merge rules are unchanged; the existing investigation remains deferred in [sync-known-issues.md](sync-known-issues.md).

## Draft recovery

- Notes and quests share a tested local-draft lifecycle, but keep separate storage formats and namespaces. Existing quest draft keys are unchanged.
- Note drafts use `daily-note-editor:v1:...` keys and a per-tab session identity. They are not application notes, exported backups, or peer-synced content.
- Changes are saved after 300ms and flushed on page hide, backgrounding, and editor unmount. Keep draft saves and closes without updating the actual note.
- Reopen New note or edit the same note in the same tab to recover it. Drafts survive reload and are separate from other tabs and quest drafts.
- If editable source content changed after the draft began, choose Resume earlier draft or Use current version explicitly. Timestamp/archive-only changes do not trigger a false content conflict.
- Save or confirmed discard clears the draft. Corrupt, incompatible, and oversized drafts are ignored/rejected; failed writes are reported rather than marked saved.
- Draft limits are one million JSON characters. If draft storage fails, saving the actual note is still available, provided application storage works.
- Drafts tied to notes deleted before reopening are not listed in a standalone recovery browser. That discovery UI remains a possible follow-up; an editor that is still open can save its text as a new note.
- Clearing site/session storage removes draft recovery. Exported backups protect saved notes, not unfinished drafts.

## Verification

From `client`:

```bash
npm run test:run
npm run lint
npm run build
npm run test:e2e
```

New coverage includes:
- Search across fields, deterministic sorting, active/archive scopes, and tag-filter empty states.
- Colorful/subtle rendering without stored color/timestamp changes, including palette contrast checks.
- Markdown selection formatting, sequential numbering, list continuation, and preserving meaningful whitespace.
- Full-screen phone editing, Preview, tags/color, and a short viewport with Save available.
- Reload recovery, tab/quest-draft isolation, stale-content choices, and failed draft writes.
- Archived editing, filtered archive deletion, live reader updates, and deletion during editing.

Screenshots with fixture data are written to ignored Playwright artifacts. Quest editor, radar, calendar/weather, and sync tests remain part of the regression suite.

## Review points

1. Compare Subtle and Colorful with actual notes, especially bright/custom colors.
2. Try title/content/tag search, archive filtering, and recent-update sorting.
3. Try long Markdown, code, tables, and writing with the phone keyboard open.
4. Exercise Keep draft, reload, and reopening an existing note draft.
5. Decide whether the final desktop editor should remain a dialog or become a dedicated workspace. Browser Back is covered by the [mobile-polish slice](v2-mobile-polish.md); physical-device PWA acceptance and global note-tag management remain follow-up work.
