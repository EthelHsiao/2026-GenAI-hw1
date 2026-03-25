import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { streamAnthropicMessage } from '@/lib/anthropicApi'
import { buildSystemPrompt, CONFESSION_PROMPT, DEFAULT_CHARACTERS, INTERACTION_PROMPT } from '@/lib/characters'
import { getDisplayContent, parseAffectionDelta } from '@/lib/affectionParser'
import { type CharId, type Character, type ChronicleEntry, type ConquestData, MILESTONE_THRESHOLDS, INTERACTIONS } from '@/types'
import type { Settings } from '@/types'
import { toast } from 'sonner'

interface StreamingState {
  isStreaming: boolean
  streamingCharId: CharId | null
  currentStreamContent: string
}

interface GameStoreState {
  characters: Record<CharId, Character>
  activeCharacterId: CharId
  chronicle: ChronicleEntry[]
  streaming: StreamingState
  conquestData: ConquestData | null

  // Actions
  setActiveCharacter: (id: CharId) => void
  setAffection: (charId: CharId, value: number) => void
  updateUserPersona: (charId: CharId, persona: string) => void
  sendMessage: (text: string, settings: Settings) => Promise<void>
  triggerInteraction: (interactionId: string, settings: Settings) => Promise<void>
  stopStreaming: () => void
  closeConquest: () => void
  resetCharacter: (id: CharId) => void
  _triggerConquest: (charId: CharId, settings: Settings) => Promise<void>
}

let abortController: AbortController | null = null

function getMilestoneDescription(name: string, threshold: number): string {
  if (threshold === 100) return `與${name}的好感度達到了 100！攻略成功！💛`
  if (threshold === 85) return `與${name}開始曖昧了，好感度突破 85！❤️`
  if (threshold === 60) return `與${name}越來越熟，好感度突破 60！🩷`
  return `與${name}成為朋友，好感度突破 30！🩶`
}

function showAffectionToast(delta: number, charName: string) {
  if (delta > 0) {
    toast.success(`💕 ${charName} 好感度 +${delta}`, {
      duration: 2500,
      style: { background: '#fdf2f8', border: '1px solid #f9a8d4', color: '#9d174d' },
    })
  } else if (delta < 0) {
    toast.error(`💔 ${charName} 好感度 ${delta}`, { duration: 2500 })
  }
}

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      characters: { ...DEFAULT_CHARACTERS },
      activeCharacterId: 'A' as CharId,
      chronicle: [],
      streaming: {
        isStreaming: false,
        streamingCharId: null,
        currentStreamContent: '',
      },
      conquestData: null,

      setActiveCharacter: (id) => set({ activeCharacterId: id }),

      setAffection: (charId, value) =>
        set((state) => ({
          characters: {
            ...state.characters,
            [charId]: {
              ...state.characters[charId],
              affection: Math.max(0, Math.min(100, value)),
            },
          },
        })),

      updateUserPersona: (charId, persona) =>
        set((state) => ({
          characters: {
            ...state.characters,
            [charId]: { ...state.characters[charId], userPersona: persona },
          },
        })),

      stopStreaming: () => {
        abortController?.abort()
        set(() => ({
          streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' },
        }))
      },

      closeConquest: () => set({ conquestData: null }),

      resetCharacter: (id) =>
        set((state) => ({
          characters: {
            ...state.characters,
            [id]: { ...DEFAULT_CHARACTERS[id] },
          },
          chronicle: state.chronicle.filter((e) => e.characterId !== id),
        })),

      sendMessage: async (text: string, settings: Settings) => {
        if (!settings.apiKey.trim()) {
          toast.error('請先在設定中填入 API Key')
          return
        }

        const state = get()
        const { activeCharacterId, characters, chronicle } = state
        const character = characters[activeCharacterId]

        if (state.streaming.isStreaming) return

        const isFirstChat = character.messages.length === 0
        const newChronicleEntries: ChronicleEntry[] = []
        if (isFirstChat) {
          newChronicleEntries.push({
            id: crypto.randomUUID(),
            characterId: activeCharacterId,
            type: 'first_chat',
            description: `與${character.name}的第一次對話開始了…`,
            timestamp: new Date().toISOString(),
          })
        }

        const userMsg = {
          id: crypto.randomUUID(),
          role: 'user' as const,
          content: text,
          timestamp: new Date().toISOString(),
        }

        const updatedMessages = [...character.messages, userMsg].slice(-10)

        set((state) => ({
          characters: {
            ...state.characters,
            [activeCharacterId]: { ...character, messages: updatedMessages },
          },
          chronicle: [...chronicle, ...newChronicleEntries],
          streaming: { isStreaming: true, streamingCharId: activeCharacterId, currentStreamContent: '' },
        }))

        abortController = new AbortController()

        try {
          const apiMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }))

          await streamAnthropicMessage(
            {
              apiKey: settings.apiKey,
              model: settings.model,
              systemPrompt: buildSystemPrompt(character),
              messages: apiMessages,
              maxTokens: settings.maxTokens,
              temperature: settings.temperature,
              topP: settings.topP,
            },
            (chunk) => {
              set((state) => ({
                streaming: {
                  ...state.streaming,
                  currentStreamContent: state.streaming.currentStreamContent + chunk,
                },
              }))
            },
            () => {
              const raw = get().streaming.currentStreamContent
              const { clean, delta } = parseAffectionDelta(raw)

              const assistantMsg = {
                id: crypto.randomUUID(),
                role: 'assistant' as const,
                content: clean,
                timestamp: new Date().toISOString(),
              }

              const currentChar = get().characters[activeCharacterId]
              const oldAffection = currentChar.affection
              const newAffection = Math.max(0, Math.min(100, oldAffection + delta))

              showAffectionToast(delta, currentChar.name)

              const milestones = MILESTONE_THRESHOLDS.filter(
                (m) => oldAffection < m && newAffection >= m,
              )
              const milestoneEntries: ChronicleEntry[] = milestones.map((m) => ({
                id: crypto.randomUUID(),
                characterId: activeCharacterId,
                type: m === 100 ? 'conquered' : 'milestone',
                description: getMilestoneDescription(currentChar.name, m),
                timestamp: new Date().toISOString(),
              }))

              const finalMessages = [...currentChar.messages, assistantMsg].slice(-10)

              set((state) => ({
                characters: {
                  ...state.characters,
                  [activeCharacterId]: {
                    ...state.characters[activeCharacterId],
                    affection: newAffection,
                    messages: finalMessages,
                  },
                },
                chronicle: [...state.chronicle, ...milestoneEntries],
                streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' },
              }))

              if (newAffection >= 100 && oldAffection < 100) {
                get()._triggerConquest(activeCharacterId, settings)
              }
            },
            abortController.signal,
          )
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            set({ streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' } })
            return
          }
          toast.error(`API 錯誤：${(err as Error).message}`)
          set({ streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' } })
        }
      },

      triggerInteraction: async (interactionId: string, settings: Settings) => {
        if (!settings.apiKey.trim()) {
          toast.error('請先在設定中填入 API Key')
          return
        }

        const state = get()
        const { activeCharacterId, characters } = state
        const character = characters[activeCharacterId]

        if (state.streaming.isStreaming) return

        const interaction = INTERACTIONS.find((i) => i.id === interactionId)
        if (!interaction || character.affection < interaction.minAffection) return

        const eventMsg = {
          id: crypto.randomUUID(),
          role: 'user' as const,
          content: INTERACTION_PROMPT(interaction.label, character.name),
          timestamp: new Date().toISOString(),
          isEvent: true,
          eventLabel: interaction.label,
          eventEmoji: interaction.emoji,
        }

        const updatedMessages = [...character.messages, eventMsg].slice(-10)

        set((state) => ({
          characters: {
            ...state.characters,
            [activeCharacterId]: { ...character, messages: updatedMessages },
          },
          streaming: { isStreaming: true, streamingCharId: activeCharacterId, currentStreamContent: '' },
        }))

        abortController = new AbortController()

        try {
          const apiMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }))

          await streamAnthropicMessage(
            {
              apiKey: settings.apiKey,
              model: settings.model,
              systemPrompt: buildSystemPrompt(character),
              messages: apiMessages,
              maxTokens: settings.maxTokens,
              temperature: settings.temperature,
              topP: settings.topP,
            },
            (chunk) => {
              set((state) => ({
                streaming: {
                  ...state.streaming,
                  currentStreamContent: state.streaming.currentStreamContent + chunk,
                },
              }))
            },
            () => {
              const raw = get().streaming.currentStreamContent
              const { clean, delta } = parseAffectionDelta(raw)

              const assistantMsg = {
                id: crypto.randomUUID(),
                role: 'assistant' as const,
                content: clean,
                timestamp: new Date().toISOString(),
              }

              const currentChar = get().characters[activeCharacterId]
              const oldAffection = currentChar.affection
              const newAffection = Math.max(0, Math.min(100, oldAffection + delta))

              showAffectionToast(delta, currentChar.name)

              const finalMessages = [...currentChar.messages, assistantMsg].slice(-10)

              set((state) => ({
                characters: {
                  ...state.characters,
                  [activeCharacterId]: {
                    ...state.characters[activeCharacterId],
                    affection: newAffection,
                    messages: finalMessages,
                  },
                },
                streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' },
              }))

              if (newAffection >= 100 && oldAffection < 100) {
                get()._triggerConquest(activeCharacterId, settings)
              }
            },
            abortController.signal,
          )
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            set({ streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' } })
            return
          }
          toast.error(`API 錯誤：${(err as Error).message}`)
          set({ streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' } })
        }
      },

      _triggerConquest: async (charId: CharId, settings: Settings) => {
        const character = get().characters[charId]
        set({ conquestData: { charId, confession: '', isGenerating: true } })

        const confessionAbort = new AbortController()
        try {
          await streamAnthropicMessage(
            {
              apiKey: settings.apiKey,
              model: settings.model,
              systemPrompt: buildSystemPrompt(character),
              messages: [{ role: 'user', content: CONFESSION_PROMPT(character.name) }],
              maxTokens: 300,
              temperature: 0.9,
              topP: 1.0,
            },
            (chunk) => {
              set((state) => ({
                conquestData: state.conquestData
                  ? { ...state.conquestData, confession: state.conquestData.confession + chunk }
                  : null,
              }))
            },
            () => {
              set((state) => ({
                conquestData: state.conquestData
                  ? { ...state.conquestData, isGenerating: false }
                  : null,
              }))
            },
            confessionAbort.signal,
          )
        } catch {
          set((state) => ({
            conquestData: state.conquestData
              ? { ...state.conquestData, isGenerating: false }
              : null,
          }))
        }
      },
    }),
    {
      name: 'otome-game',
      partialize: (state) => ({
        characters: state.characters,
        activeCharacterId: state.activeCharacterId,
        chronicle: state.chronicle,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<GameStoreState>
        // Migrate characters: fill in any missing fields from DEFAULT_CHARACTERS
        const migratedCharacters = { ...current.characters }
        if (p.characters) {
          for (const id of ['A', 'B', 'C'] as CharId[]) {
            migratedCharacters[id] = {
              ...DEFAULT_CHARACTERS[id],
              ...p.characters[id],
              userPersona: p.characters[id]?.userPersona ?? '',
            }
          }
        }
        return {
          ...current,
          ...p,
          characters: migratedCharacters,
        }
      },
    },
  ),
)

// Selector helpers
export const selectActiveCharacter = (state: GameStoreState) =>
  state.characters[state.activeCharacterId]

export const selectStreamingDisplay = (state: GameStoreState) => ({
  isStreaming: state.streaming.isStreaming,
  streamingCharId: state.streaming.streamingCharId,
  displayContent: getDisplayContent(state.streaming.currentStreamContent),
})
