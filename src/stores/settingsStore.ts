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
  model: 'qwen35-4b' as ModelId,
  temperature: 0.9,
  maxTokens: 1024,
  topP: 1.0,
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY ?? '',
  searchApiKey: '',
  autoTts: false,
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
      // Merge persisted partial with defaults so new fields are always initialised
      merge: (persisted, current) => ({
        ...current,
        settings: { ...DEFAULT_SETTINGS, ...(persisted as SettingsStore).settings },
      }),
    },
  ),
)
