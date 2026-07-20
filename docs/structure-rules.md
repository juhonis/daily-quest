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
*   **Rule 2:** Always store dates in Zustand as **ISO strings** (e.g., `"2023-10-24T00:00:00.000Z"` or just `"2023-10-24"` for simple dates). Never store raw JS Date objects in Zustand (they don't serialize well to `localStorage`).
*   **Rule 3:** All date math must be done inside `src/utils/dateUtils.ts` using `date-fns`. 
    *   *Example:* Create functions like `isToday(dateString)`, `getStartOfWeek(dateString)`, `formatForDisplay(dateString)`. Components just call these.

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

### Summary Checklist for a PR/Feature:
Whenever you finish a feature, quickly ask yourself:
1. Did I put a generic UI button in the `features` folder by mistake?
2. Did I do date math in the component instead of `dateUtils.ts`?
3. Did I extract my TS Interfaces to the `types` folder?
4. Are my Tailwind classes getting out of hand (time to make a reusable component)?