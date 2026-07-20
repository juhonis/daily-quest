import { CalendarColumn } from '../../features/calendar/CalendarColumn'
import { QuestsColumn } from '../../features/quests/QuestsColumn'
import { DoneColumn } from '../../features/done/DoneColumn'

export function AppShell() {
  return (
    <div className="grid min-h-screen md:grid-cols-[280px_1fr_320px] bg-slate-900 text-white">
      <div className="border-r border-slate-700 overflow-y-auto max-h-screen">
        <CalendarColumn />
      </div>
      <div className="overflow-y-auto max-h-screen">
        <QuestsColumn />
      </div>
      <div className="border-l border-slate-700 overflow-y-auto max-h-screen">
        <DoneColumn />
      </div>
    </div>
  )
}
