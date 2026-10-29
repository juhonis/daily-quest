# V2 Android / PWA polish

Branch: `feat/v2-mobile-polish`, based on the accepted Notes workspace in `v2`. Feature PRs target `v2`.

## Physical target and coverage boundaries

- **Primary phone:** OnePlus Nord 2T 5G, Android 14.
- **Browsers:** Chrome, Brave with normal Shields settings, and Firefox, in normal browsing mode.
- Automated coverage uses Chromium with touch/mobile settings and a representative 393×851 CSS viewport, plus desktop Firefox at a narrow width. The exact phone viewport depends on browser chrome, display scaling, and orientation.
- Playwright cannot emulate Firefox's `isMobile` mode. Firefox engine/layout results are not evidence of testing Firefox Android itself.
- The Chromium drag test uses trusted CDP touch events. Firefox has move-button coverage; actual touch dragging, the OS keyboard, Back gestures, and browser installation flows require the phone checklist below.
- Brave's Chromium ancestry helps coverage but does not substitute for testing Brave with its own browser settings.

## Implemented behavior

### Screens and Back navigation

- Day, Notes, and Library use browser history and a `view` query parameter. Day is the default URL; Notes uses `?view=notes`, Library `?view=library`.
- Back/Forward restores the app screen. Screen changes preserve per-view scroll positions during the current app session; note search/filter state stays mounted as before.
- Each open modal registers a transient history slot. Back dismisses the top modal before moving to another app view. Native Escape/cancel and explicit close/save remove their slot instead of leaving an empty Back step.
- Reader-to-editor transitions replace a slot rather than making Back reopen a stale reader. Nested settings close one layer at a time.
- A declined discard restores the editor's history position and retains its content. Accepted discard clears the draft using the existing editor behavior.
- Reload resumes the screen, not transient dialogs; drafts remain recoverable by reopening the editor. Forward does not reconstruct stale dialogs or serialized note/quest content.
- QR join links keep their existing fragment handling without overwriting app navigation state.
- The app does not intercept Android's keyboard dismissal or prevent normal exit from the root screen. Verify that OS-level ordering on the actual phone.

### Keyboard and viewport handling

- Chromium's `interactive-widget=resizes-content` remains enabled.
- A visualViewport fallback bounds and positions modal dialogs when only the visible viewport shrinks, as can occur with other browser/keyboard configurations.
- Notes' full-screen editor reduces its textarea height in that fallback so content and Save can remain above the keyboard.
- Pinch zoom and ordinary small address-bar changes do not activate the keyboard fallback.
- Dialog body resizing brings focused text fields back into view without scrolling the background page. Native focus containment and safe-area spacing remain in place.

### Touch customization

- Customize uses larger drag handles, visibility labels, and merge/unmerge controls.
- Mouse drag starts after moving 8px. Touch drag starts after holding 250ms with an 8px movement tolerance; ordinary scrolling from the rest of a row remains available.
- Move up/down buttons provide an alternative to dragging, with boundary states and a live announcement of the new position.
- Merge selection is an explicit native select. Sections that already include merged sources explain why they cannot themselves be merged elsewhere until unmerged.
- Board handles use the same mouse/touch/keyboard sensor setup.

### PWA and updates

- Manifest explicitly defines `/` as the stable app ID, start URL, and scope, with standalone display, dark launch colors, and unrestricted orientation.
- PNG icons are provided at 192px and 512px, with a separate opaque 512px maskable asset. The scalable source retains the existing green-check/cyan/yellow identity and keeps its artwork inside the maskable safe zone.
- Normal builds use checked-in assets; icon generation is not a Cloudflare build dependency. To regenerate, install Playwright Chromium and run `npm run icons:generate` in `client`.
- Updates wait for an explicit Reload rather than activating automatically. The update notice is hidden while a modal (including an editor or sync session) is open; it can also be dismissed for the current visit.
- First installation/offline readiness is handled without a persistent notification banner. Weather/radar still need network access; saved quests and notes work offline.

### Local HTTP UI testing

- UUID creation uses the native secure-context API when available and a cryptographically random v4 fallback otherwise. This keeps local creation/completion/draft actions usable over ordinary HTTP LAN addresses.
- PWA installation, service workers, and peer sync still depend on browser secure-context requirements. A plain LAN IP is suitable for UI testing, not complete PWA/sync acceptance.

## Testing locally on the OnePlus without Cloudflare previews

Use exported copies of real data for comparisons. Browser profiles and different origins/ports have separate storage.

### USB loopback forwarding

1. Install [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools) on the computer if needed.
2. Enable developer options and USB debugging on the OnePlus. Connect it by USB and authorize the computer on the phone.
3. In a terminal on the computer, run:

   ```bash
   adb devices
   ```

   Confirm that the phone is listed as a connected `device`.

4. For hot-reload UI review, run `npm run dev` from `client`, confirm `http://localhost:5173` opens on the computer, then:

   ```bash
   adb reverse tcp:5173 tcp:5173
   ```

5. Open **http://localhost:5173** in the phone browser. This is useful for UI review; service-worker registration is not enabled in the normal Vite dev build.

If the project runs in WSL, verify the address works in the Windows browser before forwarding it with Windows `adb`.

### Production-build PWA review

From `client`:

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

In a separate terminal:

```bash
adb reverse tcp:4173 tcp:4173
```

Open **http://localhost:4173** on the phone. Loopback is a browser-trusted origin and allows testing the generated service worker and installation flow. The 4173 origin has different storage from 5173 and production; import a copy of a backup if needed.

Static Vite preview does not provide the pairing API. For local UI plus sync, follow [device-sync.md](device-sync.md#local-development), use local Pages on port 8788, and forward that port with `adb reverse tcp:8788 tcp:8788`. This does not require deploying the branch to Cloudflare.

## OnePlus acceptance checklist

Record the browser version, keyboard app, navigation mode, and whether the test runs in a tab or installed/home-screen mode. Test the primary setup first; also try three-button navigation if practical.

### Navigation and keyboard — each browser

- [ ] Navigate Day → Notes → Library, then Back and Forward; each step changes the expected view.
- [ ] Open a reader; Back closes it before leaving Notes.
- [ ] Open Settings → Edit panels; Back closes only the top layer, then Settings, then the previous app view.
- [ ] In an editor with the keyboard open, first Back hides the keyboard. Next Back requests the editor close; declining discard keeps the draft and the editor usable.
- [ ] Save/Cancel/X do not leave empty Back steps. Root Day can exit normally rather than trapping the browser/app.
- [ ] Quest and note Save controls remain reachable with the keyboard open, including long text, Preview, custom schedules, tags, and validation errors.
- [ ] Rotate the phone while editing, open/close the keyboard, and change browser address-bar visibility. Check header, focused field, footer, and bottom navigation spacing.
- [ ] Try the system font/display scaling actually used on the phone, plus a larger text setting if useful. No clipped labels or accidental page-wide horizontal scrolling.

### Touch — each browser

- [ ] In Customize, scroll naturally from labels and merge controls without reordering.
- [ ] A brief swipe on a handle does not start an unintended drag; hold then drag reorders the section.
- [ ] Move up/down, visibility, merge/unmerge, and tag-section removal remain usable without dragging.
- [ ] Calendar, forecast strip, radar, and code/table scrolling do not trap navigation or activate unrelated controls.

### Installation, offline, and backgrounding

- [ ] Chrome and Brave: use the browser's available Install/Add to Home screen flow; inspect the icon and launch colors.
- [ ] Firefox: exercise its available home-screen/install flow and record whether it launches standalone or in browser chrome. Do not assume Chromium's install UI exists.
- [ ] Reopen the installed/home-screen app offline after one successful online launch; read and create saved notes/quests, then reopen again to confirm persistence.
- [ ] Keep a draft, background/reopen the browser, and recover it. Test ordinary browser lifecycle first; private mode or cleared site storage has different persistence expectations.
- [ ] With a subsequent frontend build, verify an available-update notice waits until the editor is closed. Reload explicitly and confirm saved data/drafts remain available.
- [ ] Keep Brave's normal Shields settings. If something fails, record the failure before changing browser protection settings.

Physical-device items remain pending until performed by the user. Browser WebRTC compatibility and the earlier Firefox sync issue remain tracked separately in [sync-known-issues.md](sync-known-issues.md).

## Automated verification

From `client`:

```bash
npm run test:run
npm run lint
npm run build
npx playwright install chromium firefox
npm run test:e2e
npm run test:android
```

`test:e2e` runs the complete Chromium regression suite. `test:android` runs the focused mobile-polish file in Chromium mobile/touch emulation and narrow desktop Firefox. One CDP-only touch-dispatch case is skipped for Firefox; its move-button behavior is tested.

Automated checks cover screen/history restoration, nested overlays, declined discard, explicit close/save and handoffs, reload/drafts, visual-only keyboard bounds, panel movement/merging, long-press activation, manifest PNG dimensions, offline reopening/saving, and the UUID fallback. Unit tests verify update readiness does not itself reload the app. These do not claim to automate Android's OS keyboard, home-screen installation, Brave Shields, or a real two-build installed-app update.
