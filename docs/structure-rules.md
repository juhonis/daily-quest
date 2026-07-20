### 1. Folder Structure (Domain-Driven / Feature-Based)
Instead of grouping files by *type* (e.g., putting all components in one massive folder), group them by *feature*. This makes it much easier to scale when you add gamification later.

```text
src/
├── assets/          # Images, global CSS, icons
├── components/      # Shared/Global UI (Buttons, Modals, Inputs) - DUMB components
│   ├── ui/          # Generic UI components
│   └── layout/      # Shell, Sidebars, Columns
├── features/        # Smart domain-specific modules (The core of your app)
│   ├── calendar/    # Left column components & calendar logic
│   ├── quests/      # Middle/Right column components, Quest Form, Task Cards
│   └── gamification/# (Future) XP Bar, Unlocks, Stats
├── store/           # Zustand setup
│   └── useStore.ts  # Can be split into slices (questSlice, gamificationSlice) later
├── types/           # Global TypeScript interfaces (Quest, SubQuest, etc.)
├── utils/           # Pure helper functions
│   ├── dateUtils.ts # ALL date-fns logic goes here
│   └── cn.ts        # Tailwind class merger (clsx + tailwind-merge)
├── App.tsx
└── main.tsx
```

---

### 2. The "Golden Rule" of Dates (Crucial for Calendar Apps)
Dates are the #1 source of bugs in task/calendar apps due to timezones and formatting.
*   **Rule 1:** NEVER use `new Date()` directly inside a UI component.
*   **Rule 2:** Always store dates in Zustand as **plain `'YYYY-MM-DD'` string** (NOT full ISO with time). Full ISO introduces a time component that breaks "today" across timezones; raw JS Date objects don't serialize to localStorage reliably.
*   **Rule 3:** All date math must be done inside `src/utils/dateUtils.ts` using `date-fns` / `date-fns-tz`.
    *   *Example:* Create functions like `getTodayLocal()`, `isToday(dateString)`, `getStartOfWeek(dateString)`, `formatForDisplay(dateString)`. Components just call these.
*   **Rule 4:** "Today" is the user's local calendar day. Never use `new Date().toISOString()` — implement `getTodayLocal()` once and reuse it everywhere. This keeps a future Postgres sync as a pure schema-mapping exercise, not a refactor.

---

### 3. Component Architecture Rules
*   **Smart vs. Dumb Components:**
    *   `src/components/ui` should be **Dumb**. A `<Checkbox />` doesn't know about Zustand or Quests. It just takes `isChecked` and `onChange` props.
    *   `src/features/...` should be **Smart**. A `<QuestList />` component imports Zustand, gets the current date, filters the quests, and maps out the dumb components.
*   **Early Returns:** Avoid deep nesting in components. If an item isn't loading, return early.

---

### 4. Zustand State Management Rules
*   **Selectors over Full Store:** When consuming state in a component, DO NOT grab the whole store. This causes unnecessary re-renders.
    *   *Bad:* `const store = useStore()`
    *   *Good:* `const quests = useStore((state) => state.quests)`
*   **Keep State Flat:** Avoid deeply nested objects in your store. Your proposed plan (separating `Quests` from `Completions` into two separate arrays) perfectly follows this rule!

---

### 5. Styling & Glassmorphism Rules (Tailwind)
Glassmorphism requires combining 5-6 utility classes (blur, background color/opacity, border, shadow). Writing this manually on every component will create massive, unreadable files.
*   **Rule:** Abstract complex Tailwind combinations. You have two options:
    1.  *CSS File:* Create a `.glass-panel` class in your `index.css` using `@apply`.
    2.  *Utility Function:* Use a library like `tailwind-merge` + `clsx` (standard practice in modern React, popularized by shadcn/ui).
    *   Create a reusable wrapper component: `<GlassCard>{children}</GlassCard>` so you only ever write the glass styling *once*.

---

### 6. TypeScript Rules
*   **Strict Mode:** Keep `strict: true` in your `tsconfig.json`.
*   **No `any`:** Never use `any`. If you don't know a type, use `unknown` or define a generic.
*   **Centralize Domain Types:** Types that define your business logic (`Quest`, `CompletionRecord`, `RepeatType`) should live in `src/types/index.ts`. Component prop types should live in the component file itself.

---

### 7. Accessibility Rules (Baked in from Phase 1)
Glassmorphism + heavy animation is notoriously bad for a11y. Bake these in from day 1, don't retrofit in Phase 3:
*   **Semantic elements:** Use real `<button>`, `<input type="checkbox">`, `<dialog>` etc. before reaching for divs.
*   **Keyboard navigable:** Every interactive element must have a visible focus ring; checkboxes toggle on Space.
*   **ARIA discipline:** Icon-only buttons need `aria-label`. Calendar dates use `aria-current="date"`. Quest cards announce completion via `aria-live` regions where appropriate.
*   **Motion:** Wrap all animations in `@media (prefers-reduced-motion: no-preference)`.
*   **Contrast:** Glassmorphism easily fails WCAG. Provide a `@media (prefers-contrast: more)` fallback that hardens backgrounds/borders. Verify with at least a spot-check on key components.

---

### 8. Quick Presets & Activation Workflow
*   **`quickPresets`** are user-extensible: curated defaults (Wordle, Connections, NYT Mini) ship with `isUserDefined: false`; users can add their own with `isUserDefined: true`. The Create-Quest form pulls from this list; deleting a preset does not delete existing quests that were created from it.
*   **Inactive Quests:** A `Quest` with `status: 'inactive'` and empty `targetDate` is a "parked" idea. It does not render in the calendar until `activateQuest(id, date)` is called. This supports the user's "create now, schedule later" mental model without polluting the calendar view.
*   **Archive vs Delete:** `archiveQuest` sets `archivedAt` + `status: 'inactive'` (history preserved). `deleteQuest` is permanent. Calendar filtering always excludes archived (and `inactive`) quests, but the right-column stats may still surface archived history.

---

### Summary Checklist for a PR/Feature:
Whenever you finish a feature, quickly ask yourself:
1. Did I put a generic UI button in the `features` folder by mistake?
2. Did I do date math in the component instead of `dateUtils.ts`?
3. Did I extract my TS Interfaces to the `types` folder?
4. Are my Tailwind classes getting out of hand (time to make a reusable component)?
5. Did I add an `aria-label` / keyboard handler to my newest interactive element?
6. Did I write a `vitest` test for any new logic in `dateUtils.ts`?