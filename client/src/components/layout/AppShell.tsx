import { CalendarColumn } from '../../features/calendar/CalendarColumn'
import { QuestsColumn } from '../../features/quests/list/QuestsColumn'
import { RightColumn } from '../../features/right/RightColumn'
import { useStore } from '../../store/useStore'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { PanelLeft, PanelRight } from 'lucide-react'

const DESKTOP_QUERY = '(min-width: 1280px)'

function Drawer({
  side,
  onClose,
  children,
}: {
  side: 'left' | 'right'
  onClose: () => void
  children: React.ReactNode
}) {
  const positionClass =
    side === 'left'
      ? 'left-0 w-[280px] border-r border-slate-700'
      : 'right-0 w-[320px] border-l border-slate-700'
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50" onClick={onClose} />
      <div
        className={`fixed inset-y-0 z-40 overflow-y-auto overflow-x-hidden bg-slate-900 shadow-2xl pt-10 ${positionClass}`}
      >
        {children}
      </div>
    </>
  )
}

export function AppShell() {
  const leftOverride = useStore((s) => s.leftColumnOverride)
  const rightOverride = useStore((s) => s.rightColumnOverride)
  const setLeftOverride = useStore((s) => s.setLeftColumnOverride)
  const setRightOverride = useStore((s) => s.setRightColumnOverride)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  const showLeft = leftOverride ?? isDesktop
  const showRight = rightOverride ?? isDesktop

  const gridTemplateColumns = isDesktop
    ? '280px minmax(0, 1fr) 320px'
    : 'minmax(0, 1fr)'

  const centerClassName = `overflow-y-auto overflow-x-hidden max-h-screen min-w-0 ${
    isDesktop ? '' : 'pt-10'
  }`

  const toggleButtonClass = (active: boolean) =>
    `p-1.5 rounded-full transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
    }`

  return (
    <div
      className="relative grid min-h-screen bg-slate-900 text-white"
      style={{ gridTemplateColumns }}
    >
      {isDesktop ? (
        <>
          <div
            className={`overflow-y-auto max-h-screen min-w-0 pt-10 ${
              showLeft ? 'border-r border-slate-700' : ''
            }`}
          >
            {showLeft && <CalendarColumn />}
          </div>
          <div className={centerClassName}>
            <QuestsColumn />
          </div>
          <div
            className={`overflow-y-auto max-h-screen min-w-0 pt-10 ${
              showRight ? 'border-l border-slate-700' : ''
            }`}
          >
            {showRight && <RightColumn />}
          </div>
        </>
      ) : (
        <>
          {showLeft && (
            <Drawer side="left" onClose={() => setLeftOverride(false)}>
              <CalendarColumn />
            </Drawer>
          )}
          <div className={centerClassName}>
            <QuestsColumn />
          </div>
          {showRight && (
            <Drawer side="right" onClose={() => setRightOverride(false)}>
              <RightColumn />
            </Drawer>
          )}
        </>
      )}

      <button
        onClick={() => setLeftOverride(!showLeft)}
        className={`fixed top-2 left-2 z-50 ${toggleButtonClass(showLeft)}`}
        title={showLeft ? 'Hide calendar' : 'Show calendar'}
        aria-label={showLeft ? 'Hide calendar' : 'Show calendar'}
      >
        <PanelLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => setRightOverride(!showRight)}
        className={`fixed top-2 right-2 z-50 ${toggleButtonClass(showRight)}`}
        title={showRight ? 'Hide side panel' : 'Show side panel'}
        aria-label={showRight ? 'Hide side panel' : 'Show side panel'}
      >
        <PanelRight className="w-4 h-4" />
      </button>
    </div>
  )
}
