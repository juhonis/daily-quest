interface QuestsTabsProps {
  activeTab: string
  onChange: (tab: 'quests' | 'create' | 'notes') => void
}

export function QuestsTabs({ activeTab, onChange }: QuestsTabsProps) {
  return (
    <div className="inline-flex rounded-lg bg-slate-800 p-1">
      <button
        onClick={() => onChange('quests')}
        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          activeTab === 'quests'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
        aria-selected={activeTab === 'quests'}
        role="tab"
      >
        Quests
      </button>
      <button
        onClick={() => onChange('create')}
        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          activeTab === 'create'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
        aria-selected={activeTab === 'create'}
        role="tab"
      >
        Create Quests (+)
      </button>
      <button
        onClick={() => onChange('notes')}
        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          activeTab === 'notes'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
        aria-selected={activeTab === 'notes'}
        role="tab"
      >
        Notes
      </button>
    </div>
  )
}
