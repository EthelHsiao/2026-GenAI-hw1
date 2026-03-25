import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings, ModelId } from '@/types'

interface SettingsStore {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
}

const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'qwen35-397b' as ModelId,
  temperature: 0.9,
  maxTokens: 1024,
  topP: 1.0,
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'otome-settings',
    },
  ),
)
