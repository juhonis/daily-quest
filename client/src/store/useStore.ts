import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, PanelId } from '../types'
import { getTodayLocal } from '../utils/dateUtils'
import { normalizeQuest, normalizeCompletion, normalizeNote, normalizeQuickPreset } from '../utils/normalize'
import { ensureSync, projectSync, restoreSync, trackChanges } from '../utils/sync/state'
import { canonical, mergeRecords, primary, writeRecord, type Recovery, type SyncData } from '../utils/sync/records'
import { parseSyncData } from '../utils/sync/validation'

// A fresh identity per tab/process avoids copied identities and cross-tab counter reuse.
const replica = crypto.randomUUID()

function latestSync(): SyncData {
  if (typeof localStorage === 'undefined') return { records: [] }
  const raw = localStorage.getItem('daily-quest-store')
  if (!raw) return { records: [] }
  try { return parseSyncData(JSON.parse(raw).state?.sync ?? { records: [] }) } catch { return { records: [] } }
}

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
    (persistSet, get) => {
      const set = (update: Partial<AppState> | ((state: AppState) => Partial<AppState> | AppState)) => {
        persistSet((current) => {
          const sync = mergeRecords(ensureSync(current), latestSync())
          const base = { ...current, ...projectSync(sync), sync }
          const changes = typeof update === 'function' ? update(base) : update
          const next = { ...base, ...changes }
          return { ...next, sync: trackChanges(base, next, replica) }
        })
      }
      return ({
      sync: { records: [] },
      applySync: (incoming) => persistSet((current) => {
        const sync = mergeRecords(ensureSync(current), latestSync(), incoming)
        return { ...projectSync(sync), sync }
      }),
      resolveRecovery: (id, restore) => {
        const current = get()
        const sync = mergeRecords(ensureSync(current), latestSync())
        const record = sync.records.find((r) => r.kind === 'recovery' && r.id === id)
        if (!record || primary(record).value === null) return
        if (restore) {
          const recovery = primary(record).value as Recovery
          const source = sync.records.find((r) => r.kind === recovery.kind && r.id === recovery.id)
          if (source) sync.records.push(writeRecord(source, recovery.value, replica))
        }
        sync.records.push(writeRecord(record, null, replica))
        current.applySync(sync)
      },
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

      importData: (payload) =>
        persistSet((s) => ({
          sync: restoreSync({ ...s, sync: mergeRecords(ensureSync(s), latestSync()) }, payload, payload.sync, replica),
          quests: payload.quests,
          completions: payload.completions,
          notes: payload.notes,
          quickPresets: payload.quickPresets,
          panelOrder: payload.panelOrder.length > 0 ? payload.panelOrder : s.panelOrder,
          hiddenPanels: payload.hiddenPanels,
          mergedPanels: payload.mergedPanels,
          tagPanels: payload.tagPanels,
          tagColors: payload.tagColors,
          noteTagColors: payload.noteTagColors,
          filterTags: [],
          filterNoteTags: [],
          coords: null,
          locationMode: payload.locationMode,
          locationName: payload.locationName,
        })),

      setLeftColumnOverride: (visible) => set({ leftColumnOverride: visible }),
      setRightColumnOverride: (visible) => set({ rightColumnOverride: visible }),
    })},
    {
      name: 'daily-quest-store',
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | null
        if (typeof p !== 'object' || p === null) return current
        let sync = current.sync
        try { if (p.sync) sync = parseSyncData(p.sync) } catch { /* Rebuild metadata from live data if persisted metadata is malformed. */ }
        return {
          ...current,
          ...p,
          sync,
          selectedDate: current.selectedDate,
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

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== 'daily-quest-store' || !event.newValue) return
    const current = ensureSync(useStore.getState())
    const merged = mergeRecords(current, latestSync())
    if (canonical(current) !== canonical(merged)) useStore.getState().applySync(merged)
  })
}
