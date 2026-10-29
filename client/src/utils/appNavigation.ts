import { createId } from './createId'

export type AppScreen = 'day' | 'notes' | 'library'
interface NavigationEntry {
  version: 1
  session: string
  index: number
  screen: AppScreen
  dialogs: string[]
  scroll: number
}
type CloseDialog = () => void | boolean
const stateKey = 'dailyQuestNavigation'
const dialogs = new Map<string, CloseDialog>()
const closingFromBack = new Set<string>()
const listeners = new Set<() => void>()
const scrollPositions = new Map<AppScreen, number>()
let entry: NavigationEntry
let initialized = false
let queued = false
let traversing = false
let restoring = false
let queuedScreen: AppScreen | undefined

export function screenFromUrl(url: URL): AppScreen {
  const value = url.searchParams.get('view')
  return value === 'notes' || value === 'library' ? value : 'day'
}

function readEntry(): NavigationEntry | null {
  const value = history.state?.[stateKey] as NavigationEntry | undefined
  return value?.version === 1 && typeof value.session === 'string' && Number.isSafeInteger(value.index) && value.index >= 0 &&
    ['day', 'notes', 'library'].includes(value.screen) && Array.isArray(value.dialogs) && value.dialogs.every((id) => typeof id === 'string') &&
    Number.isFinite(value.scroll) ? value : null
}

function urlForScreen(screen: AppScreen): URL {
  const url = new URL(location.href)
  if (screen === 'day') url.searchParams.delete('view')
  else url.searchParams.set('view', screen)
  return url
}

function write(next: NavigationEntry, push: boolean) {
  const previous = history.state && typeof history.state === 'object' ? history.state : {}
  const state = { ...previous, [stateKey]: next }
  if (push) history.pushState(state, '', urlForScreen(next.screen))
  else history.replaceState(state, '', urlForScreen(next.screen))
  entry = next
}

function publish() { for (const listener of listeners) listener() }
const equal = (a: string[], b: string[]) => a.length === b.length && a.every((value, index) => value === b[index])

function scheduleReconcile() {
  if (queued) return
  queued = true
  queueMicrotask(() => { queued = false; reconcile() })
}

function reconcile() {
  if (!initialized || traversing) return
  const active = [...dialogs.keys()].filter((id) => !closingFromBack.has(id))
  if (equal(entry.dialogs, active)) return
  if (active.length < entry.dialogs.length) {
    traversing = true
    history.go(-(entry.dialogs.length - active.length))
    return
  }
  // A reader-to-editor handoff replaces its slot instead of leaving a ghost
  // reader in history. New nested dialogs still get their own Back entry.
  if (!equal(entry.dialogs, active.slice(0, entry.dialogs.length))) {
    write({ ...entry, dialogs: active.slice(0, entry.dialogs.length) }, false)
  }
  for (let depth = entry.dialogs.length + 1; depth <= active.length; depth++) {
    write({ ...entry, scroll: window.scrollY }, false)
    write({ ...entry, index: entry.index + 1, dialogs: active.slice(0, depth) }, true)
  }
}

function restoreScroll(position: number) {
  requestAnimationFrame(() => window.scrollTo({ top: position, behavior: 'instant' }))
}

function onPopState() {
  const target = readEntry()
  if (traversing) {
    traversing = false
    restoring = false
    entry = target ?? { ...entry, index: 0, screen: screenFromUrl(new URL(location.href)), dialogs: [], scroll: 0 }
    publish()
    restoreScroll(entry.scroll)
    if (queuedScreen) { const screen = queuedScreen; queuedScreen = undefined; navigateScreen(screen) }
    scheduleReconcile()
    return
  }

  const previous = entry
  const next = target && target.session === entry.session ? target
    : { ...entry, index: 0, screen: screenFromUrl(new URL(location.href)), dialogs: [], scroll: 0 }
  const desired = next.dialogs.filter((id) => dialogs.has(id))
  const active = [...dialogs.keys()]
  let common = 0
  while (common < desired.length && common < active.length && desired[common] === active[common]) common++
  for (const id of active.slice(common).reverse()) {
    closingFromBack.add(id)
    if (dialogs.get(id)?.() === false) {
      closingFromBack.delete(id)
      // A declined discard must keep the editor and its Back entry intact.
      const distance = previous.index - next.index
      if (distance) { traversing = true; restoring = true; history.go(distance) }
      else write(previous, false)
      return
    }
  }
  entry = { ...next, dialogs: desired }
  write(entry, false)
  publish()
  restoreScroll(next.scroll)
  // Forward does not reopen stale readers/editors, which contain no serialized
  // content or callbacks. Reopening remains an explicit UI action.
  if (!desired.length && !active.length && next.screen === previous.screen && next.index < previous.index && next.index > 0) {
    history.back()
  } else scheduleReconcile()
}

export function initializeNavigation() {
  if (initialized) return
  initialized = true
  const old = readEntry()
  entry = old ?? { version: 1, session: createId(), index: 0, screen: screenFromUrl(new URL(location.href)), dialogs: [], scroll: 0 }
  entry = { ...entry, screen: screenFromUrl(new URL(location.href)) }
  history.scrollRestoration = 'manual'
  window.addEventListener('popstate', onPopState)
  if (old?.dialogs.length && old.index >= old.dialogs.length) {
    // Reload resumes the screen, not transient overlays. Drafts remain in their
    // own storage; remove the old overlay history slots as well.
    traversing = true
    history.go(-old.dialogs.length)
  } else write({ ...entry, dialogs: [] }, false)
}

export function subscribeNavigation(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
export function currentScreen(): AppScreen { return initialized ? entry.screen : screenFromUrl(new URL(location.href)) }
export function currentDialogCount(): number { return dialogs.size }

export function navigateScreen(screen: AppScreen) {
  initializeNavigation()
  if (traversing || dialogs.size) { if (traversing && !restoring) queuedScreen = screen; return }
  if (screen === entry.screen) return
  scrollPositions.set(entry.screen, window.scrollY)
  write({ ...entry, scroll: window.scrollY }, false)
  write({ ...entry, index: entry.index + 1, screen, dialogs: [], scroll: scrollPositions.get(screen) ?? 0 }, true)
  publish()
  restoreScroll(entry.scroll)
}

export function registerDialog(id: string, close: CloseDialog): () => void {
  initializeNavigation()
  dialogs.set(id, close)
  publish()
  scheduleReconcile()
  return () => {
    dialogs.delete(id)
    closingFromBack.delete(id)
    publish()
    scheduleReconcile()
  }
}
