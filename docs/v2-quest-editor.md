# V2 quest editor

Branch: `feat/v2-quest-editor`, based on the accepted `v2` layout prototype. Feature PRs target `v2`.

## Editing flow

- **Title and Schedule** are the primary fields. Date, Repeat, Today/Tomorrow shortcuts, and Carry forward are shown while the quest is scheduled.
- **Description**, **Subquests**, and **Tags** expand inline. Existing content opens its section when editing.
- **More options** contains the external link, Quick add preset checkbox, and optional XP metadata. Validation opens this section if a hidden field needs attention.
- Save and Cancel live in a separate dialog footer, outside the scrolling form body. The title receives initial focus; focused inputs are brought back into the form's visible area when it resizes.
- A shorter viewport is covered in browser tests. Chromium is instructed to resize content for the virtual keyboard where supported; actual Android/iOS keyboard behavior still needs a physical-device check.

## Scheduling terminology

- New quests default to **Once**, with carry-forward off, matching Quick add's default. Existing quests keep their settings.
- **Carry forward until completed** is explicit. Quick add's old Important mode is labeled **Carry forward**.
- The date's old Important today section is labeled **Planned**, and Rollover is **Carried forward**. Stored panel IDs, order, visibility, and merges are unchanged.
- **Park for later** saves an inactive quest with no target date. It appears in Library, not the calendar. Editing it and choosing Schedule restores date/repeat controls.
- Archived quests retain their archive state and original scheduling metadata. Editing content does not implicitly unarchive or reschedule them.
- Custom intervals require a whole number of at least one. Invalid dates, links, and XP are shown next to the relevant fields.
- Parking does not require finishing schedule fields; an incomplete custom interval is stored as one until the quest is scheduled and reviewed.

## Subquests, tags, and presets

- Subquest IDs and existing completion flags are preserved when titles are edited. A nonempty New step field is included on save, even if Add was not pressed.
- Selecting or creating a tag affects only the editor until the quest is saved. Discarding the form does not leave global tag colors behind.
- Tag search is not automatically attached as a tag: choose a suggestion, press Enter, or use Create tag.
- **Settings → Quest tags → Manage quest tags** contains global rename, delete, and color controls. Rename is explicit; duplicate names are rejected instead of silently merging tags.
- **Save title and link to Quick add** stores only the fields supported by the existing preset model. Scheduling is chosen separately when using the preset.
- The editor and Quick add's preset manager share link validation; complete HTTP(S) links are required and protocol case is normalized for backup compatibility.
- Saving an edit preserves the quest ID, creation timestamp, link/icon, XP, sort order, rollover limit, archive metadata, and completed subquests unless their editable fields were deliberately changed.

## Local drafts

- Drafts use separate `daily-quest-editor:v1:...` localStorage keys, with a per-tab identity in sessionStorage. They are not quests, are not included in exports, and are not peer-synced.
- Changes are debounced for 300ms and flushed on page hide, tab backgrounding, or editor unmount.
- **Keep draft** saves and closes without creating/updating a quest. Reopen New quest, or edit the same existing quest in the same tab, to resume.
- Reloading the tab preserves its draft. Separate tabs have separate draft keys.
- Cancel, close, and Escape ask before discarding modified content. Confirming discard or successfully saving the quest clears its draft.
- Recovery is automatic if the original quest's editable baseline is unchanged. If it changed, the editor offers **Resume earlier draft** or **Use current version** before applying the old values.
- Original IDs are reserved in new drafts so recovery/retry does not create duplicate quests. An already-saved new-quest draft is ignored if cleanup previously failed.
- Corrupt or incompatible drafts are ignored. Oversized drafts and storage failures are reported rather than being marked saved. If draft storage alone fails, saving the actual quest is still available.
- Clearing site data removes drafts. Finishing/discarding a draft is preferable before deleting the tab's session or browser storage.

## Verification

From `client`:

```bash
npm run test:run
npm run lint
npm run build
npm run test:e2e
```

Coverage includes:
- Once/carry-forward consistency between the editor and Quick add.
- Custom schedules, optional fields, pending steps, tags, link validation, and preset creation on a touch-emulated phone.
- Parking and rescheduling through Library.
- Draft recovery after reload, Keep draft, tab isolation, stale edit recovery, and draft-storage failure.
- No global tag mutations on cancel, plus Settings rename/recolor behavior.
- Archived and active metadata/completion preservation.
- Save controls and focused-field visibility in a short viewport, alongside existing responsive, radar, and sync tests.

Review screenshots are generated with fixture data in the ignored Playwright artifacts. Real-device keyboard behavior, touch panel reordering, and the Notes editor remain separate follow-up work.
