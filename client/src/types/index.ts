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
}

interface QuickPreset {
  id: string
  title: string
  externalUrl?: string
  icon?: string
  isUserDefined: boolean
}

interface WeatherCoords {
  lat: number
  lon: number
}

interface WeatherData {
  hourly: {
    time: string[]
    temperature_2m: number[]
    weathercode: number[]
  }
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
  filterTags: string[]
  setFilterTags: (tags: string[]) => void
  setCoords: (coords: WeatherCoords) => void
  setLocationMode: (mode: LocationMode) => void
  setLocationName: (name: string) => void
}

export type { RepeatType, QuestStatus, PanelId, SubQuest, Quest, CompletionRecord, QuickPreset, WeatherCoords, WeatherData, LocationMode, AppState }
