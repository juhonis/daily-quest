type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'
type QuestStatus = 'active' | 'inactive'
type PanelId = 'daily' | 'repeating' | 'important' | 'rollover' | 'done'
type LocationMode = 'auto' | 'manual'

interface SubQuest {
  id: string
  title: string
  isCompleted: boolean
}

interface Quest {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
  targetDate: string
  repeat: RepeatType
  repeatConfig?: {
    interval: number
    unit: 'day' | 'week' | 'month'
  }
  rollover: boolean
  subQuests: SubQuest[]
  externalUrl?: string
  icon?: string
  status: QuestStatus
  archivedAt: string | null
  xp?: number | null
  maxRolloverDays?: number | null
  sortOrder?: number
  tags?: string[]
}

interface CompletionRecord {
  id: string
  questId: string
  completedOn: string
  updatedAt: string
}

interface QuickPreset {
  id: string
  title: string
  externalUrl?: string
  icon?: string
  isUserDefined: boolean
  updatedAt: string
}

interface ImportPayload {
  quests: Quest[]
  completions: CompletionRecord[]
  notes: Note[]
  quickPresets: QuickPreset[]
  panelOrder: PanelId[]
  hiddenPanels: PanelId[]
  mergedPanels: Partial<Record<PanelId, PanelId>>
  tagPanels: string[]
  tagColors: Record<string, string>
  noteTagColors: Record<string, string>
  locationMode: LocationMode
  locationName: string
}

interface WeatherCoords {
  lat: number
  lon: number
}

interface WeatherData {
  current_weather?: {
    temperature: number
    weathercode: number
    time: string
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weathercode: number[]
    rain?: number[]
  }
}

interface Note {
  id: string
  title: string
  content: string
  color: string
  tags?: string[]
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

interface AppState {
  quests: Quest[]
  completions: CompletionRecord[]
  quickPresets: QuickPreset[]
  selectedDate: string
  panelOrder: PanelId[]
  hiddenPanels: PanelId[]
  coords: WeatherCoords | null
  locationMode: LocationMode
  locationName: string

  addQuest: (quest: Quest) => void
  updateQuest: (questId: string, updates: Partial<Quest>) => void
  deleteQuest: (questId: string) => void
  activateQuest: (questId: string, targetDate: string) => void
  archiveQuest: (questId: string) => void
  toggleCompletion: (questId: string, date: string) => void
  toggleSubQuest: (questId: string, subQuestId: string, date: string) => void
  setSelectedDate: (date: string) => void
  addQuickPreset: (preset: QuickPreset) => void
  updateQuickPreset: (presetId: string, updates: Partial<QuickPreset>) => void
  deleteQuickPreset: (presetId: string) => void
  addQuestFromPreset: (preset: QuickPreset, date: string, overrides?: { repeat?: RepeatType; rollover?: boolean; repeatConfig?: { interval: number; unit: 'day' | 'week' | 'month' }; tags?: string[] }) => void
  setPanelOrder: (order: PanelId[]) => void
  togglePanelHidden: (id: PanelId) => void
  notes: Note[]
  noteTagColors: Record<string, string>
  filterNoteTags: string[]
  filterTags: string[]
  setFilterTags: (tags: string[]) => void
  tagColors: Record<string, string>
  setTagColor: (tag: string, color: string) => void
  deleteTag: (tag: string) => void
  renameTag: (oldTag: string, newTag: string) => void
  tagPanels: string[]
  addTagPanel: (tag: string) => void
  removeTagPanel: (tag: string) => void
  leftColumnOverride: boolean | null
  rightColumnOverride: boolean | null
  setLeftColumnOverride: (visible: boolean | null) => void
  setRightColumnOverride: (visible: boolean | null) => void
  mergedPanels: Partial<Record<PanelId, PanelId>>
  mergePanel: (source: PanelId, target: PanelId) => void
  unmergePanel: (source: PanelId) => void
  addNote: (note: Note) => void
  updateNote: (noteId: string, updates: Partial<Note>) => void
  deleteNote: (noteId: string) => void
  archiveNote: (noteId: string) => void
  unarchiveNote: (noteId: string) => void
  setNoteTagColor: (tag: string, color: string) => void
  deleteNoteTag: (tag: string) => void
  setFilterNoteTags: (tags: string[]) => void
  setCoords: (coords: WeatherCoords) => void
  setLocationMode: (mode: LocationMode) => void
  setLocationName: (name: string) => void
  importData: (payload: ImportPayload) => void
}

export type { RepeatType, QuestStatus, PanelId, SubQuest, Quest, CompletionRecord, QuickPreset, Note, WeatherCoords, WeatherData, LocationMode, AppState, ImportPayload }
