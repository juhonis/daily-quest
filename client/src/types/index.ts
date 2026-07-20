type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'
type QuestStatus = 'active' | 'inactive'

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

interface AppState {
  quests: Quest[]
  completions: CompletionRecord[]
  quickPresets: QuickPreset[]
  selectedDate: string

  addQuest: (quest: Quest) => void
  updateQuest: (questId: string, updates: Partial<Quest>) => void
  deleteQuest: (questId: string) => void
  activateQuest: (questId: string, targetDate: string) => void
  archiveQuest: (questId: string) => void
  toggleCompletion: (questId: string, date: string) => void
  setSelectedDate: (date: string) => void
  addQuickPreset: (preset: QuickPreset) => void
  updateQuickPreset: (presetId: string, updates: Partial<QuickPreset>) => void
  deleteQuickPreset: (presetId: string) => void
}

export type { RepeatType, QuestStatus, SubQuest, Quest, CompletionRecord, QuickPreset, AppState }
