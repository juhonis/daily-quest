# Daily Quest - Development Plan

## 1. Project Overview
"Daily Quest" is a modern, flexible task manager and calendar app that will eventually feature lightweight gamification. 
* **Core Philosophy:** Positive reinforcement only (no penalties for missed days), highly flexible quest types, and a visually stunning "Apple Liquid Glass" interface.
* **Layout:** 3-column desktop layout (Calendar -> Active Quests -> Finished/Stats).
* **Stack:** React, TypeScript, Vite, Zustand (with persist), Tailwind CSS (recommended for UI), `date-fns` (for calendar logic).

---

## 2. Tech Stack & Dependencies
* **Framework:** React + TypeScript via Vite (`npm create vite@latest daily-quest -- --template react-ts`)
* **State Management:** `zustand` (with `persist` middleware for local storage)
* **Date Manipulation:** `date-fns` (Crucial for handling repeating tasks and calendar logic safely)
* **Styling:** `tailwindcss` + standard CSS for glassmorphism effects.
* **Icons:** `lucide-react`
* **Animations (Future):** `framer-motion`
* **PWA / Offline:** `vite-plugin-pwa` (set up in Phase 1 so install-to-homescreen + offline caching work from day one — retrofitting is painful)
* **Testing:** `vitest` for unit testing `dateUtils.ts` (recurring logic is the highest-bug-risk surface area)

---

## 3. Data Architecture (Zustand Store)
To handle recurring tasks without duplicating data, we separate the "Rules" (Quests) from the "Actions" (Completions).

### Core TypeScript Interfaces
```typescript
type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
type QuestStatus = 'active' | 'inactive';

interface SubQuest {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface Quest {
  id: string;
  title: string;
  description?: string;
  createdAt: string;        // 'YYYY-MM-DD' plain date string
  targetDate: string;      // 'YYYY-MM-DD' plain date string (initial day assigned)
  repeat: RepeatType;
  repeatConfig?: {         // Required when repeat === 'custom'
    interval: number;      // e.g., every 2
    unit: 'day' | 'week' | 'month';
  };
  rollover: boolean;       // If true, appears every day until completed
  subQuests: SubQuest[];
  externalUrl?: string;    // e.g., Link to Wordle
  icon?: string;           // Optional icon identifier
  status: QuestStatus;    // 'inactive' lets users create quests without a date and activate later
  archivedAt: string | null; // Distinguishes "parked" from deleted
  xp?: number | null;      // Nullable; locked in now to avoid Phase 4 migrations
  maxRolloverDays?: number | null; // null = never expire (default). Field reserved for future flexibility.
}

interface CompletionRecord {
  id: string;              // Unique ID for the completion event
  questId: string;         // Ties back to the Quest
  completedOn: string;     // 'YYYY-MM-DD' plain date string (not full ISO — avoids timezone bugs)
}

interface QuickPreset {
  id: string;
  title: string;
  externalUrl?: string;
  icon?: string;
  isUserDefined: boolean;  // false for curated defaults (Wordle, Connections, NYT Mini)
}

// Zustand Store Shape
interface AppState {
  quests: Quest[];
  completions: CompletionRecord[];
  quickPresets: QuickPreset[];  // Seeded with curated defaults; user can add/edit
  selectedDate: string;         // 'YYYY-MM-DD' — date currently viewed in the middle column
  
  // Quest actions
  addQuest: (quest: Quest) => void;
  updateQuest: (questId: string, updates: Partial<Quest>) => void;
  deleteQuest: (questId: string) => void;
  activateQuest: (questId: string, targetDate: string) => void; // status 'inactive' -> 'active'
  archiveQuest: (questId: string) => void;
  toggleCompletion: (questId: string, date: string) => void;
  setSelectedDate: (date: string) => void;
  
  // QuickPreset actions
  addQuickPreset: (preset: QuickPreset) => void;
  updateQuickPreset: (presetId: string, updates: Partial<QuickPreset>) => void;
  deleteQuickPreset: (presetId: string) => void;
}
```

### Date Storage & Timezone Model
* **Always store `targetDate` and `completedOn` as `'YYYY-MM-DD'` plain date strings** (not full ISO with time). This avoids timezone bugs where "today at 11pm" rolls over to yesterday.
* Derive "today" only via `dateUtils.ts` helpers (e.g., `getTodayLocal()`). **Never call `new Date().toISOString()` inside a component.**
* A "day" means the user's local calendar day. Cross-device sync (if added later) maps each row to its plain date string in Postgres — no timezone math required.

### Recurring Quest Semantics (Lock These Down)
* **Daily quest checked Monday does NOT auto-complete Tuesday's instance.** Each date gets its own `CompletionRecord`.
* **Weekly quest missed** with `rollover: false` → vanishes for that week, re-appears next week per repeat rule.
* **Weekly quest missed** with `rollover: true` → carries forward every day until completed (no expiry by default, per policy).
* **`isQuestActiveOnDate(quest, date, completions)`** algorithm:
  1. `quest.status === 'active'` (else false)
  2. `quest.targetDate <= date`
  3. No `CompletionRecord` exists for `questId` on `date` (already done today → not active)
  4. Repeat rule matches `date` (per `repeat` / `repeatConfig`) **OR** `quest.rollover && !hasCompletionBetween(questId, targetDate, date)`
  5. If `maxRolloverDays` is non-null, ensure `date - lastCompletionOrTarget <= maxRolloverDays`

### Activation / Inactivity Workflow
* A user can create a `Quest` with `status: 'inactive'` and a placeholder/empty `targetDate`. It will not appear on any calendar date until `activateQuest(id, realTargetDate)` flips it to `'active'`.
* `archiveQuest(id)` sets `archivedAt` and `status: 'inactive'` — preserving history without deletion. Delete is permanent.
* **Rollover never auto-expires.** The list grows only with completed quests parked in the right column and historical `CompletionRecord`s; unbounded growth is curbed by user-driven archive/delete, not auto-expiry.

---

## 4. UI / UX Blueprint
**Theme:** Apple Liquid Glass (Glassmorphism). Requires a colorful/abstract animated background with semi-transparent, blurred component containers.

### Desktop Layout (3 Columns)
1. **Left Column (Calendar):**
   * Vertical, infinite-scroll style list of dates.
   * Highlights the current day.
   * Clicking a date updates the `selectedDate` in Zustand, changing the Middle Column.
2. **Middle Column (Active Quests):**
   * "Add Quest" button/input at the top.
   * Carousel/Row of "Quick Add" premade quests (Wordle, Connections, etc.).
   * List of Active Quests for the `selectedDate`.
   * **Visual Hierarchy:** Rollover tasks from previous days grouped at the top -> Today's specific tasks -> Daily repeating tasks.
3. **Right Column (Finished & Future Stats):**
   * Tasks checked off for the `selectedDate` migrate here to keep the middle column clean.
   * *Future:* XP Bar, User Level, Lifetime Streaks/Stats, Rewards.

### Mobile Layout
* **Tabs / Bottom Nav:** Convert the 3 columns into a swipeable view or use bottom navigation (📅 Calendar | ⚔️ Quests [Default] | 🏆 Done/Stats).

---

## 5. Implementation Roadmap

### Phase 1: Foundation & State 
- [ ] Initialize Vite + React + TS + Tailwind.
- [ ] Set up `vite-plugin-pwa` (manifest, service worker, install prompt) — do NOT defer this.
- [ ] Set up `vitest` and write initial smoke tests for `getTodayLocal()` and `formatForDisplay()`.
- [ ] Install and configure `date-fns` + `date-fns-tz`.
- [ ] Set up the Zustand store with `persist` middleware.
- [ ] Seed `quickPresets` with curated defaults (Wordle, NYT Mini, Connections).
- [ ] Implement CRUD + `activateQuest` / `archiveQuest` actions for `quests`, `completions`, and `quickPresets`.
- [ ] Create `dateUtils.ts` helpers (`isQuestActiveOnDate`, `getTodayLocal`, `formatForDisplay`, `hasCompletionBetween`).

### Phase 2: Ugly MVP & Core Logic 
*Goal: Build the app without styling to ensure the complex date logic works.*
- [ ] Build basic 3-column grid layout.
- [ ] **Left:** Build vertical calendar. Allow selecting a date. (`aria-current="date"`, keyboard-navigable grid)
- [ ] **Middle:** Build the "Create Quest" form (Title, Target date, Status toggle, Rollover toggle, Repeat dropdown + custom config, Sub-quests, optional XP).
- [ ] **Middle:** Render tasks that belong to the `selectedDate`, grouped per `isQuestActiveOnDate` semantics.
- [ ] **Middle:** "Quick Add" carousel rendering `quickPresets`; add "Create preset" affordance for users.
- [ ] **Middle (Optional — outline now, build later if in-scope):** Drag-to-reorder quests. Pre-include a `sortOrder` field on `Quest` to avoid a schema migration later; decide during Phase 2 whether to ship DnD UI.
- [ ] **Checkbox Logic:** Clicking a task creates/removes a `CompletionRecord` for that date. Use real `<input type="checkbox">` or `role="checkbox"` + `aria-checked` + keyboard toggle.
- [ ] **Right:** Render tasks that have a `CompletionRecord` for the `selectedDate`.
- [ ] **Unit tests:** Cover `isQuestActiveOnDate` for daily/weekly/monthly/custom/rollover cases before moving to Phase 3.

### Phase 3: The "Liquid Glass" UI & Polish
- [ ] Create the CSS variables / Tailwind config for Glassmorphism (blurs, translucent backgrounds, soft white borders).
- [ ] Enforce min contrast ratios; provide `prefers-contrast: more` fallback (glassmorphism easily fails WCAG).
- [ ] Honor `prefers-reduced-motion` for all animations.
- [ ] Find or create an abstract, colorful background.
- [ ] Style the Calendar (Left).
- [ ] Style the Task Cards (Middle/Right).
- [ ] Add the "Quick Add" carousel styling for premade links (Wordle, NYT Mini).
- [ ] Build the mobile-responsive view (Bottom Navigation).

### Phase 4: Gamification Prep (Future)
- [ ] Wire `Quest.xp` into XP totals via Zustand.
- [ ] Build the visual XP bar in the Right Column.
- [ ] Implement streak tracking on top of existing `CompletionRecord`s (no schema change needed — derivable).
- [ ] Implement custom Rewards system.
