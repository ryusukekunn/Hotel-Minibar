import { useState, useEffect } from 'react'
import { onNetworkChange } from '../lib/offline'

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const cleanup = onNetworkChange(setIsOnline)
    return cleanup
  }, [])

  return isOnline
}
