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

---

## 3. Data Architecture (Zustand Store)
To handle recurring tasks without duplicating data, we separate the "Rules" (Quests) from the "Actions" (Completions).

### Core TypeScript Interfaces
```typescript
type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

interface SubQuest {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface Quest {
  id: string;
  title: string;
  description?: string;
  createdAt: string;     // ISO String
  targetDate: string;    // ISO String (The initial day it was assigned to)
  repeat: RepeatType;
  rollover: boolean;     // If true, appears every day until completed
  subQuests: SubQuest[];
  externalUrl?: string;  // e.g., Link to Wordle
  icon?: string;         // Optional icon identifier
}

interface CompletionRecord {
  id: string;            // Unique ID for the completion event
  questId: string;       // Ties back to the Quest
  completedOn: string;   // ISO String (The day it was checked off)
}

// Zustand Store Shape
interface AppState {
  quests: Quest[];
  completions: CompletionRecord[];
  selectedDate: string;  // The date currently viewed in the middle column
  
  // Actions
  addQuest: (quest: Quest) => void;
  updateQuest: (questId: string, updates: Partial<Quest>) => void;
  deleteQuest: (questId: string) => void;
  toggleCompletion: (questId: string, date: string) => void;
  setSelectedDate: (date: string) => void;
}
```

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
- [ ] Set up the Zustand store with `persist` middleware.
- [ ] Implement CRUD actions in Zustand for `quests` and `completions`.
- [ ] Install `date-fns` and create utility functions (e.g., `isQuestActiveOnDate(quest, date, completions)`).

### Phase 2: Ugly MVP & Core Logic 
*Goal: Build the app without styling to ensure the complex date logic works.*
- [ ] Build basic 3-column grid layout.
- [ ] **Left:** Build vertical calendar. Allow selecting a date.
- [ ] **Middle:** Build the "Create Quest" form (Title, Rollover toggle, Repeat dropdown, Sub-quests).
- [ ] **Middle:** Render tasks that belong to the `selectedDate`. 
- [ ] **Checkbox Logic:** Clicking a task creates/removes a `CompletionRecord` for that specific date.
- [ ] **Right:** Render tasks that have a `CompletionRecord` for the `selectedDate`.

### Phase 3: The "Liquid Glass" UI & Polish
- [ ] Create the CSS variables / Tailwind config for Glassmorphism (blurs, translucent backgrounds, soft white borders).
- [ ] Find or create an abstract, colorful background.
- [ ] Style the Calendar (Left).
- [ ] Style the Task Cards (Middle/Right).
- [ ] Add the "Quick Add" carousel for premade links (Wordle, NYT Mini).
- [ ] Build the mobile-responsive view (Bottom Navigation).

### Phase 4: Gamification Prep (Future)
- [ ] Add XP values to Quests.
- [ ] Update Zustand store to track total XP.
- [ ] Build the visual XP bar in the Right Column.
- [ ] Implement custom Rewards system.
