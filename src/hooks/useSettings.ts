import { useCallback, useState } from 'react'
import { DEFAULT_SETTINGS } from '@/constants/models'
import type { AppSettings } from '@/types/chat'

const STORAGE_KEY = 'chatgpt-settings'

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setSettings(DEFAULT_SETTINGS)
  }, [])

  return { settings, updateSettings, resetSettings }
}
