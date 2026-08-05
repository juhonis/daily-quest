import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, PanelId } from '../types'
import { getTodayLocal } from '../utils/dateUtils'
import { normalizeQuest, normalizeCompletion, normalizeNote, normalizeQuickPreset } from '../utils/normalize'

const now = () => new Date().toISOString()

const seededPresets: AppState['quickPresets'] = [
  {
    id: 'preset-wordle',
    title: 'Wordle',
    externalUrl: 'https://nytimes.com/games/wordle',
    isUserDefined: false,
    updatedAt: '2023-03-20',
  },
  {
    id: 'preset-nyt-mini',
    title: 'NYT Mini',
    externalUrl: 'https://nytimes.com/crosswords/Mini',
    isUserDefined: false,
    updatedAt: '2023-03-20',
  },
  {
    id: 'preset-connections',
    title: 'Connections',
    externalUrl: 'https://nytimes.com/games/connections',
    isUserDefined: false,
    updatedAt: '2023-03-20',
  },
]

const defaultPanelOrder: PanelId[] = ['daily', 'repeating', 'important', 'rollover', 'done']

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      quests: [],
      notes: [],
      noteTagColors: {},
      filterNoteTags: [],
      completions: [],
      quickPresets: seededPresets,
      selectedDate: getTodayLocal(),
      panelOrder: defaultPanelOrder,
      hiddenPanels: [],
      filterTags: [],
      tagColors: {},
      mergedPanels: {},
      tagPanels: [],
      leftColumnOverride: null,
      rightColumnOverride: null,
      coords: null,
      locationMode: 'auto',
      locationName: '',

      addQuest: (quest) =>
        set((s) => ({ quests: [...s.quests, { ...quest, updatedAt: quest.updatedAt ?? now() }] })),
      updateQuest: (questId, updates) =>
        set((s) => ({
          quests: s.quests.map((q) => (q.id === questId ? { ...q, ...updates, updatedAt: now() } : q)),
        })),
      deleteQuest: (questId) =>
        set((s) => ({ quests: s.quests.filter((q) => q.id !== questId) })),

      addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),
      updateNote: (noteId, updates) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === noteId ? { ...n, ...updates, updatedAt: now() } : n)),
        })),
      deleteNote: (noteId) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== noteId) })),
      archiveNote: (noteId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId ? { ...n, archivedAt: new Date().toISOString(), updatedAt: now() } : n,
          ),
        })),
      unarchiveNote: (noteId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId ? { ...n, archivedAt: null, updatedAt: now() } : n,
          ),
        })),

      setNoteTagColor: (tag, color) =>
        set((s) => ({
          noteTagColors: { ...s.noteTagColors, [tag]: color },
        })),
      deleteNoteTag: (tag) =>
        set((s) => {
          const { [tag]: _, ...rest } = s.noteTagColors
          return {
            notes: s.notes.map((n) => ({
              ...n,
              tags: n.tags?.filter((t) => t !== tag),
              updatedAt: now(),
            })),
            noteTagColors: rest,
            filterNoteTags: s.filterNoteTags.filter((t) => t !== tag),
          }
        }),
      setFilterNoteTags: (tags) => set({ filterNoteTags: tags }),

      activateQuest: (questId, targetDate) =>
        set((s) => ({
          quests: s.quests.map((q) =>
            q.id === questId ? { ...q, status: 'active' as const, targetDate, updatedAt: now() } : q,
          ),
        })),

      archiveQuest: (questId) =>
        set((s) => ({
          quests: s.quests.map((q) =>
            q.id === questId
              ? { ...q, archivedAt: getTodayLocal(), status: 'inactive' as const, updatedAt: now() }
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
              { id: crypto.randomUUID(), questId, completedOn: date, updatedAt: now() },
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
              updatedAt: now(),
            })
          } else if (!allDone && hasCompletion) {
            newCompletions = newCompletions.filter(
              (c) => !(c.questId === questId && c.completedOn === date),
            )
          }

          return {
            quests: s.quests.map((q) =>
              q.id === questId ? { ...q, subQuests: newSubQuests, updatedAt: now() } : q,
            ),
            completions: newCompletions,
          }
        }),

      setSelectedDate: (date) => set({ selectedDate: date }),

      addQuickPreset: (preset) =>
        set((s) => ({
          quickPresets: [...s.quickPresets, { ...preset, updatedAt: preset.updatedAt ?? now() }],
        })),

      updateQuickPreset: (presetId, updates) =>
        set((s) => ({
          quickPresets: s.quickPresets.map((p) =>
            p.id === presetId ? { ...p, ...updates, updatedAt: now() } : p,
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
            createdAt: now(),
            updatedAt: now(),
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
            tags: overrides?.tags,
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

      setFilterTags: (tags) => set({ filterTags: tags }),

      addTagPanel: (tag) =>
        set((s) => ({
          tagPanels: s.tagPanels.includes(tag) ? s.tagPanels : [...s.tagPanels, tag],
        })),
      removeTagPanel: (tag) =>
        set((s) => ({
          tagPanels: s.tagPanels.filter((t) => t !== tag),
        })),

      deleteTag: (tag) =>
        set((s) => {
          const { [tag]: _, ...rest } = s.tagColors
          return {
            quests: s.quests.map((q) => ({
              ...q,
              tags: q.tags?.filter((t) => t !== tag),
              updatedAt: now(),
            })),
            tagColors: rest,
          }
        }),
      renameTag: (oldTag, newTag) =>
        set((s) => {
          const { [oldTag]: color, ...rest } = s.tagColors
          return {
            quests: s.quests.map((q) => ({
              ...q,
              tags: q.tags?.map((t) => (t === oldTag ? newTag : t)),
              updatedAt: now(),
            })),
            tagColors: color ? { ...rest, [newTag]: color } : rest,
          }
        }),
      setTagColor: (tag, color) =>
        set((s) => ({
          tagColors: { ...s.tagColors, [tag]: color },
        })),

      mergePanel: (source, target) =>
        set((s) => {
          if (source === target) return s
          if (Object.values(s.mergedPanels).includes(source)) return s
          const { [source]: _, ...withoutSource } = s.mergedPanels
          return { mergedPanels: { ...withoutSource, [source]: target } }
        }),
      unmergePanel: (source) =>
        set((s) => {
          const { [source]: _, ...rest } = s.mergedPanels
          return { mergedPanels: rest }
        }),

      setCoords: (coords) => set({ coords }),
      setLocationMode: (mode) => set({ locationMode: mode }),
      setLocationName: (name) => set({ locationName: name }),

      setLeftColumnOverride: (visible) => set({ leftColumnOverride: visible }),
      setRightColumnOverride: (visible) => set({ rightColumnOverride: visible }),
    }),
    {
      name: 'daily-quest-store',
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | null
        if (typeof p !== 'object' || p === null) return current
        return {
          ...current,
          ...p,
          quests: (p.quests ?? []).map(normalizeQuest),
          completions: (p.completions ?? []).map(normalizeCompletion),
          notes: (p.notes ?? []).map(normalizeNote),
          quickPresets: (p.quickPresets ?? []).map(normalizeQuickPreset),
          panelOrder: p.panelOrder ?? current.panelOrder,
          hiddenPanels: p.hiddenPanels ?? current.hiddenPanels,
          mergedPanels: p.mergedPanels ?? current.mergedPanels,
          tagPanels: p.tagPanels ?? current.tagPanels,
          leftColumnOverride: p.leftColumnOverride ?? current.leftColumnOverride,
          rightColumnOverride: p.rightColumnOverride ?? current.rightColumnOverride,
        }
      },
    },
  ),
)
