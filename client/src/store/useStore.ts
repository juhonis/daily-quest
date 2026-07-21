import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, PanelId } from '../types'
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

const defaultPanelOrder: PanelId[] = ['daily', 'repeating', 'important', 'rollover', 'done']

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      quests: [],
      completions: [],
      quickPresets: seededPresets,
      selectedDate: getTodayLocal(),
      panelOrder: defaultPanelOrder,
      hiddenPanels: [],

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

      toggleSubQuest: (questId, subQuestId, date) =>
        set((s) => {
          const quest = s.quests.find((q) => q.id === questId)
          if (!quest) return s

          const newSubQuests = quest.subQuests.map((sq) =>
            sq.id === subQuestId ? { ...sq, isCompleted: !sq.isCompleted } : sq,
          )
          const allDone = newSubQuests.every((sq) => sq.isCompleted)
          const hasCompletion = s.completions.some(
            (c) => c.questId === questId && c.completedOn === date,
          )

          let newCompletions = [...s.completions]
          if (allDone && !hasCompletion) {
            newCompletions.push({
              id: crypto.randomUUID(),
              questId,
              completedOn: date,
            })
          } else if (!allDone && hasCompletion) {
            newCompletions = newCompletions.filter(
              (c) => !(c.questId === questId && c.completedOn === date),
            )
          }

          return {
            quests: s.quests.map((q) =>
              q.id === questId ? { ...q, subQuests: newSubQuests } : q,
            ),
            completions: newCompletions,
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

      addQuestFromPreset: (preset, date, overrides?) =>
        set((s) => {
          const quest = {
            id: crypto.randomUUID(),
            title: preset.title,
            description: undefined,
            createdAt: getTodayLocal(),
            targetDate: date,
            repeat: overrides?.repeat ?? 'daily',
            repeatConfig: overrides?.repeatConfig,
            rollover: overrides?.rollover ?? true,
            subQuests: [],
            externalUrl: preset.externalUrl,
            icon: preset.icon,
            status: 'active' as const,
            archivedAt: null,
            xp: null,
            maxRolloverDays: null,
          }
          return { quests: [...s.quests, quest] }
        }),

      setPanelOrder: (order) => set({ panelOrder: order }),

      togglePanelHidden: (id) =>
        set((s) => ({
          hiddenPanels: s.hiddenPanels.includes(id)
            ? s.hiddenPanels.filter((h) => h !== id)
            : [...s.hiddenPanels, id],
        })),
    }),
    {
      name: 'daily-quest-store',
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState>
        return {
          ...current,
          ...p,
          panelOrder: p.panelOrder ?? current.panelOrder,
          hiddenPanels: p.hiddenPanels ?? current.hiddenPanels,
        }
      },
    },
  ),
)
