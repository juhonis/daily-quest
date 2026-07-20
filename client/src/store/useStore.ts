import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState } from '../types'
import { getTodayLocal } from '../utils/dateUtils'

const seededPresets: AppState['quickPresets'] = [
  {
    id: 'preset-wordle',
    title: 'Wordle',
    externalUrl: 'https://nytimes.com/games/wordle',
    isUserDefined: false,
  },
  {
    id: 'preset-nyt-mini',
    title: 'NYT Mini',
    externalUrl: 'https://nytimes.com/crosswords/Mini',
    isUserDefined: false,
  },
  {
    id: 'preset-connections',
    title: 'Connections',
    externalUrl: 'https://nytimes.com/games/connections',
    isUserDefined: false,
  },
]

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      quests: [],
      completions: [],
      quickPresets: seededPresets,
      selectedDate: getTodayLocal(),

      addQuest: (quest) => set((s) => ({ quests: [...s.quests, quest] })),
      updateQuest: (questId, updates) =>
        set((s) => ({
          quests: s.quests.map((q) => (q.id === questId ? { ...q, ...updates } : q)),
        })),
      deleteQuest: (questId) =>
        set((s) => ({ quests: s.quests.filter((q) => q.id !== questId) })),

      activateQuest: (questId, targetDate) =>
        set((s) => ({
          quests: s.quests.map((q) =>
            q.id === questId ? { ...q, status: 'active' as const, targetDate } : q,
          ),
        })),

      archiveQuest: (questId) =>
        set((s) => ({
          quests: s.quests.map((q) =>
            q.id === questId
              ? { ...q, archivedAt: getTodayLocal(), status: 'inactive' as const }
              : q,
          ),
        })),

      toggleCompletion: (questId, date) =>
        set((s) => {
          const existing = s.completions.find(
            (c) => c.questId === questId && c.completedOn === date,
          )
          if (existing) {
            return { completions: s.completions.filter((c) => c !== existing) }
          }
          return {
            completions: [
              ...s.completions,
              { id: crypto.randomUUID(), questId, completedOn: date },
            ],
          }
        }),

      setSelectedDate: (date) => set({ selectedDate: date }),

      addQuickPreset: (preset) =>
        set((s) => ({ quickPresets: [...s.quickPresets, preset] })),

      updateQuickPreset: (presetId, updates) =>
        set((s) => ({
          quickPresets: s.quickPresets.map((p) =>
            p.id === presetId ? { ...p, ...updates } : p,
          ),
        })),

      deleteQuickPreset: (presetId) =>
        set((s) => ({
          quickPresets: s.quickPresets.filter((p) => p.id !== presetId),
        })),
    }),
    { name: 'daily-quest-store' },
  ),
)
