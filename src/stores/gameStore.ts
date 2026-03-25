import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { streamAnthropicMessage } from '@/lib/anthropicApi'
import { buildSystemPrompt, CONFESSION_PROMPT, DEFAULT_CHARACTERS } from '@/lib/characters'
import { getDisplayContent, parseAffectionDelta } from '@/lib/affectionParser'
import { type CharId, type Character, type ChronicleEntry, type ConquestData, MILESTONE_THRESHOLDS } from '@/types'
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
  sendMessage: (text: string, settings: Settings) => Promise<void>
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

      stopStreaming: () => {
        abortController?.abort()
        set((state) => ({
          streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' },
          // Remove the incomplete streaming message placeholder
          characters: {
            ...state.characters,
            ...(state.streaming.streamingCharId
              ? {
                  [state.streaming.streamingCharId]: {
                    ...state.characters[state.streaming.streamingCharId],
                    // streaming message was not added to messages array, so nothing to remove
                  },
                }
              : {}),
          },
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
          toast.error('請先在設定中填入 Anthropic API Key')
          return
        }

        const state = get()
        const { activeCharacterId, characters, chronicle } = state
        const character = characters[activeCharacterId]

        if (state.streaming.isStreaming) return

        // Chronicle: first chat
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

        // Add user message
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
            [activeCharacterId]: {
              ...character,
              messages: updatedMessages,
            },
          },
          chronicle: [...chronicle, ...newChronicleEntries],
          streaming: {
            isStreaming: true,
            streamingCharId: activeCharacterId,
            currentStreamContent: '',
          },
        }))

        abortController = new AbortController()

        try {
          // Build API messages from completed messages (excluding the just-added user msg — it's in updatedMessages)
          const apiMessages = updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          }))

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
              // On done: parse affection delta, clean content, finalize
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

              // Find milestone crossings
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
                streaming: {
                  isStreaming: false,
                  streamingCharId: null,
                  currentStreamContent: '',
                },
              }))

              // Trigger conquest if just reached 100
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

      // Internal: trigger conquest confession generation
      _triggerConquest: async (charId: CharId, settings: Settings) => {
        const character = get().characters[charId]
        set({
          conquestData: { charId, confession: '', isGenerating: true },
        })

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
