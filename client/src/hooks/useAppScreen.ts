import { useSyncExternalStore } from 'react'
import { currentScreen, navigateScreen, subscribeNavigation } from '../utils/appNavigation'

export function useAppScreen() {
  return [useSyncExternalStore(subscribeNavigation, currentScreen), navigateScreen] as const
}
