interface QuestsTabsProps {
  activeTab: string
  onChange: (tab: 'quests' | 'create') => void
}

export function QuestsTabs({ activeTab, onChange }: QuestsTabsProps) {
  return (
    <div className="flex rounded-lg bg-slate-800 p-1 mb-4">
      <button
        onClick={() => onChange('quests')}
        className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
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
        className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'create'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
        aria-selected={activeTab === 'create'}
        role="tab"
      >
        Create Quests (+)
      </button>
    </div>
  )
}
