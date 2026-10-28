import { useRef, useState } from 'react'
import { CheckCheck, Library, NotebookPen, PanelLeftClose, PanelLeftOpen, Plus, Settings } from 'lucide-react'
import { CalendarColumn } from '../../features/calendar/CalendarColumn'
import { QuestsColumn } from '../../features/quests/list/QuestsColumn'
import { QuestCreateForm } from '../../features/quests/create/QuestCreateForm'
import { QuestLibrary } from '../../features/quests/QuestLibrary'
import { NotesGrid, type NotesGridHandle } from '../../features/notes/NotesGrid'
import { SettingsModal } from '../../features/settings/SettingsModal'
import { useStore } from '../../store/useStore'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

type Screen = 'day' | 'notes' | 'library'
const screens = [
  { id: 'day', label: 'Day', icon: CheckCheck },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'library', label: 'Library', icon: Library },
] as const

export function AppShell() {
  const [screen, setScreen] = useState<Screen>('day')
  const [showSettings, setShowSettings] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [editor, setEditor] = useState<{ id?: string; key: number } | null>(null)
  const [editorDirty, setEditorDirty] = useState(false)
  const notesRef = useRef<NotesGridHandle>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const leftOverride = useStore((s) => s.leftColumnOverride)
  const setLeftOverride = useStore((s) => s.setLeftColumnOverride)
  const selectedDate = useStore((s) => s.selectedDate)
  const quests = useStore((s) => s.quests)
  const addQuest = useStore((s) => s.addQuest)
  const updateQuest = useStore((s) => s.updateQuest)
  const addQuickPreset = useStore((s) => s.addQuickPreset)
  const calendarVisible = isDesktop && (leftOverride ?? true)

  function openEditor(id?: string) {
    setEditorDirty(false)
    setEditor({ id, key: Date.now() })
  }

  function closeEditor() {
    if (editorDirty && !window.confirm('Discard unsaved quest changes?')) return
    setEditor(null)
  }

  function navigation(mobile: boolean) {
    return (
      <nav aria-label={mobile ? 'Mobile navigation' : 'Main navigation'} className={mobile ? 'grid grid-cols-4' : 'flex items-center gap-1'}>
        {screens.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setScreen(id)} aria-current={screen === id ? 'page' : undefined}
            className={`${mobile ? 'flex min-h-14 flex-col gap-1 text-xs' : 'inline-flex min-h-11 gap-2 px-4 text-sm'} items-center justify-center rounded-lg font-medium transition-colors ${screen === id ? 'bg-blue-500/10 text-blue-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
            <Icon className="h-5 w-5" /><span>{label}</span>
          </button>
        ))}
        {mobile && <button type="button" aria-label="Settings" onClick={() => setShowSettings(true)} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"><Settings className="h-5 w-5" /><span>More</span></button>}
      </nav>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-200">
      <a href="#workspace" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:p-3 focus:text-white">Skip to workspace</a>
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-[1680px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"><CheckCheck className="h-6 w-6" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-white sm:text-base">Daily Quest <span className="ml-1 rounded bg-blue-500/10 px-1.5 py-0.5 align-middle text-[10px] font-medium text-blue-300">v2</span></p><p className="text-xs text-slate-500">A little progress, every day.</p></div>
            <Button variant="icon" className="hidden lg:inline-flex" onClick={() => setLeftOverride(!calendarVisible)} aria-label={calendarVisible ? 'Hide calendar' : 'Show calendar'}>{calendarVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}</Button>
          </div>
          <div className="hidden lg:block">{navigation(false)}</div>
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={() => screen === 'notes' ? notesRef.current?.createNote() : openEditor()} aria-label={screen === 'notes' ? 'New note' : 'New quest'}>
              <Plus className="h-4 w-4" /><span className="hidden sm:inline">{screen === 'notes' ? 'New note' : 'New quest'}</span><span className="sm:hidden">New</span>
            </Button>
            <Button variant="icon" aria-label="Settings" onClick={() => setShowSettings(true)} className="hidden lg:inline-flex"><Settings className="h-5 w-5" /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1680px] items-start" style={{ gridTemplateColumns: calendarVisible ? '248px minmax(0, 1fr)' : 'minmax(0, 1fr)' }}>
        {calendarVisible && <aside aria-label="Calendar sidebar" className="sticky top-[73px] h-[calc(100dvh-73px)] overflow-hidden border-r border-slate-800 p-3"><CalendarColumn /></aside>}
        <main id="workspace" tabIndex={-1} className="min-w-0 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 outline-none sm:px-6 lg:pb-10 lg:pt-7">
          <div hidden={screen !== 'day'}><QuestsColumn onEdit={openEditor} onChooseDate={() => setShowCalendar(true)} /></div>
          <div hidden={screen !== 'notes'} className="min-w-0">
            <div className="mb-5"><h1 className="text-2xl font-semibold tracking-tight text-white">Notes</h1><p className="mt-1 text-sm text-slate-400">A place for ideas worth keeping.</p></div>
            <NotesGrid ref={notesRef} showCreateButton={false} />
          </div>
          <div hidden={screen !== 'library'}><QuestLibrary onEdit={openEditor} /></div>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden">{navigation(true)}</div>
      {showCalendar && <Modal isOpen onClose={() => setShowCalendar(false)} title="Choose a date" className="max-w-sm"><CalendarColumn onSelect={() => setShowCalendar(false)} /></Modal>}
      {editor && <Modal isOpen onClose={closeEditor} title={editor.id ? 'Edit quest' : 'New quest'} className="max-w-3xl">
        <QuestCreateForm key={editor.key} initialData={quests.find((q) => q.id === editor.id)} defaultDate={selectedDate} onDirtyChange={() => setEditorDirty(true)} onSavePreset={addQuickPreset} onClose={closeEditor} onSave={(quest) => {
          if (quests.some((q) => q.id === quest.id)) updateQuest(quest.id, quest)
          else addQuest(quest)
          setEditor(null)
        }} />
      </Modal>}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
