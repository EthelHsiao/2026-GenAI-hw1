import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { callQwenNonStream, streamAnthropicMessage, type ApiMessage } from '@/lib/anthropicApi'
import { callGeminiApi } from '@/lib/geminiApi'
import { buildSystemPrompt, buildCompressionPrompt, CONFESSION_PROMPT, DEFAULT_CHARACTERS, INTERACTION_PROMPT } from '@/lib/characters'
import { resolveModel } from '@/lib/routing'
import { allTools, executeToolCall } from '@/lib/tools'
import { speak } from '@/lib/tts'
import { getDisplayContent, parseAffectionDelta } from '@/lib/affectionParser'
import {
  type CharId,
  type Character,
  type ChronicleEntry,
  type ConquestData,
  type DiaryEntry,
  type ImageInputData,
  type MemoryEntry,
  type Message,
  MILESTONE_THRESHOLDS,
  INTERACTIONS,
} from '@/types'
import type { Settings } from '@/types'
import { toast } from 'sonner'

// ─── State types ───────────────────────────────────────────────────────────────

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
  sendMessage: (text: string, settings: Settings, imageData?: ImageInputData) => Promise<void>
  triggerInteraction: (interactionId: string, settings: Settings) => Promise<void>
  stopStreaming: () => void
  closeConquest: () => void
  resetCharacter: (id: CharId) => void
  compressMemory: (charId: CharId, settings: Settings) => Promise<void>
  addDiaryEntry: (charId: CharId, entry: string) => void
  getDiaryEntries: (charId: CharId, limit: number) => DiaryEntry[]
  _triggerConquest: (charId: CharId, settings: Settings) => Promise<void>
}

// ─── Module-level abort controller ────────────────────────────────────────────

let abortController: AbortController | null = null

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getMilestoneDescription(name: string, threshold: number): string {
  if (threshold === 100) return `與${name}的好感度達到了 100！攻略成功！💛`
  if (threshold === 85)  return `與${name}開始曖昧了，好感度突破 85！❤️`
  if (threshold === 60)  return `與${name}越來越熟，好感度突破 60！🩷`
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

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      characters: { ...DEFAULT_CHARACTERS },
      activeCharacterId: 'A' as CharId,
      chronicle: [],
      streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' },
      conquestData: null,

      // ── Simple setters ──────────────────────────────────────────────────────

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
        set({ streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' } })
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

      // ── Diary actions ───────────────────────────────────────────────────────

      addDiaryEntry: (charId, entry) =>
        set((state) => {
          const char = state.characters[charId]
          const newEntry: DiaryEntry = {
            id: crypto.randomUUID(),
            entry,
            timestamp: new Date().toISOString(),
          }
          // Keep max 30 diary entries (FIFO)
          const diary = [...char.diary, newEntry].slice(-30)
          return {
            characters: { ...state.characters, [charId]: { ...char, diary } },
          }
        }),

      getDiaryEntries: (charId, limit) => {
        const char = get().characters[charId]
        return char.diary.slice(-Math.max(1, limit))
      },

      // ── Memory compression ──────────────────────────────────────────────────

      compressMemory: async (charId, settings) => {
        if (!settings.apiKey.trim()) return

        const character = get().characters[charId]
        const first10 = character.messages.slice(0, 10)
        if (first10.length < 10) return

        toast.info(`${character.name} 的記憶整理中…`, { id: `compress-${charId}` })

        const dialogue = first10
          .map((m) => `${m.role === 'user' ? '玩家' : character.name}：${m.content}`)
          .join('\n')

        try {
          const { model } = resolveModel({
            hasImage: false,
            isSpecialEvent: false,
            usesTool: false,
            isMemorySummary: true,
            userSelectedModel: settings.model,
          })

          const result = await callQwenNonStream({
            apiKey: settings.apiKey,
            model,
            systemPrompt: '你是一個記憶整理助手，請按照使用者的指示輸出純文字摘要。',
            messages: [{ role: 'user', content: buildCompressionPrompt(character.name, dialogue) }],
            maxTokens: 200,
            temperature: 0.7,
            topP: 1.0,
          })

          const summary = result.content?.trim()
          if (!summary) return

          const entry: MemoryEntry = {
            id: crypto.randomUUID(),
            summary,
            timestamp: new Date().toISOString(),
            messageCount: 10,
          }

          set((state) => {
            const cur = state.characters[charId]
            const newMessages = cur.messages.slice(10)
            const newMemoryLog = [...cur.memoryLog, entry].slice(-20) // max 20 summaries
            return {
              characters: {
                ...state.characters,
                [charId]: { ...cur, messages: newMessages, memoryLog: newMemoryLog },
              },
            }
          })

          toast.success(`${character.name} 的記憶已整理完成`, { id: `compress-${charId}` })
        } catch {
          toast.dismiss(`compress-${charId}`)
        }
      },

      // ── Main send message ───────────────────────────────────────────────────

      sendMessage: async (text, settings, imageData) => {
        const hasImage = !!imageData

        // Validate API keys
        if (hasImage && !settings.geminiApiKey.trim()) {
          toast.error('請先在設定中填入 Gemini API Key')
          return
        }
        if (!hasImage && !settings.apiKey.trim()) {
          toast.error('請先在設定中填入 API Key')
          return
        }

        const state = get()
        const { activeCharacterId, characters, chronicle } = state
        const character = characters[activeCharacterId]
        if (state.streaming.isStreaming) return

        // Chronicle: first chat (check existing entries to avoid duplicate after compression)
        const newChronicleEntries: ChronicleEntry[] = []
        const alreadyStarted = state.chronicle.some(
          (e) => e.characterId === activeCharacterId && e.type === 'first_chat',
        )
        if (!alreadyStarted) {
          newChronicleEntries.push({
            id: crypto.randomUUID(),
            characterId: activeCharacterId,
            type: 'first_chat',
            description: `與${character.name}的第一次對話開始了…`,
            timestamp: new Date().toISOString(),
          })
        }

        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: text || '（傳送了一張圖片）',
          timestamp: new Date().toISOString(),
          ...(imageData ? { imagePreviewUrl: imageData.previewUrl } : {}),
        }

        const updatedMessages = [...character.messages, userMsg]

        set((state) => ({
          characters: {
            ...state.characters,
            [activeCharacterId]: { ...character, messages: updatedMessages },
          },
          chronicle: [...chronicle, ...newChronicleEntries],
          streaming: { isStreaming: true, streamingCharId: activeCharacterId, currentStreamContent: '' },
        }))

        abortController = new AbortController()

        // ── Closure: finalise assistant response ──────────────────────────────
        const finalise = (raw: string, toolUsed?: { name: string; query: string }) => {
          const { clean, delta } = parseAffectionDelta(raw)

          const assistantMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: clean,
            timestamp: new Date().toISOString(),
            ...(toolUsed ? { toolName: toolUsed.name, toolQuery: toolUsed.query } : {}),
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

          const finalMessages = [...currentChar.messages, assistantMsg]

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

          // Trigger memory compression when messages hit a multiple of 10
          if (finalMessages.length > 0 && finalMessages.length % 10 === 0) {
            void get().compressMemory(activeCharacterId, settings)
          }

          // Auto TTS
          if (settings.autoTts && clean) {
            speak(clean)
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        try {
          const systemPrompt = buildSystemPrompt(character)
          // Send at most last 10 messages to the LLM as context
          const contextMessages: ApiMessage[] = updatedMessages
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content }))

          if (hasImage) {
            // ── Gemini path ─────────────────────────────────────────────────
            const raw = await callGeminiApi({
              apiKey: settings.geminiApiKey,
              systemPrompt,
              messages: contextMessages
                .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
                  m.role === 'user' || m.role === 'assistant',
                )
                .map((m) => ({
                  role: m.role === 'assistant' ? 'model' as const : 'user' as const,
                  content: m.content ?? '',
                })),
              userText: text,
              imageBase64: imageData!.base64,
              imageMimeType: imageData!.mimeType,
            })
            finalise(raw)
          } else {
            // ── Qwen path with tools ────────────────────────────────────────
            const firstModel = resolveModel({
              hasImage: false,
              isSpecialEvent: false,
              usesTool: false,
              isMemorySummary: false,
              userSelectedModel: settings.model,
            }).model

            const firstResult = await callQwenNonStream({
              apiKey: settings.apiKey,
              model: firstModel,
              systemPrompt,
              messages: contextMessages,
              maxTokens: settings.maxTokens,
              temperature: settings.temperature,
              topP: settings.topP,
              tools: allTools,
            })

            if (firstResult.toolCalls.length > 0) {
              // ── Tool-use branch: execute tool → second streaming call ──────
              const toolCall = firstResult.toolCalls[0]
              set((s) => ({
                streaming: { ...s.streaming, currentStreamContent: '執行工具中...' },
              }))

              const toolExecution = await executeToolCall(toolCall, {
                charId: activeCharacterId,
                searchApiKey: settings.searchApiKey,
                addDiaryEntry: get().addDiaryEntry,
                getDiaryEntries: get().getDiaryEntries,
              })

              set((s) => ({
                streaming: { ...s.streaming, currentStreamContent: toolExecution.statusText },
              }))

              // Clear tool status text, start streaming final response
              set((s) => ({ streaming: { ...s.streaming, currentStreamContent: '' } }))

              const secondModel = resolveModel({
                hasImage: false,
                isSpecialEvent: false,
                usesTool: true,
                isMemorySummary: false,
                userSelectedModel: settings.model,
              }).model

              const messagesWithTool: ApiMessage[] = [
                ...contextMessages,
                { role: 'assistant', content: null, tool_calls: firstResult.toolCalls },
                { role: 'tool', content: toolExecution.content, tool_call_id: toolCall.id },
              ]

              const toolUsed = { name: toolExecution.name, query: toolExecution.query }

              await streamAnthropicMessage(
                {
                  apiKey: settings.apiKey,
                  model: secondModel,
                  systemPrompt,
                  messages: messagesWithTool,
                  maxTokens: settings.maxTokens,
                  temperature: settings.temperature,
                  topP: settings.topP,
                },
                (chunk) => {
                  set((s) => ({
                    streaming: { ...s.streaming, currentStreamContent: s.streaming.currentStreamContent + chunk },
                  }))
                },
                () => {
                  const raw = get().streaming.currentStreamContent
                  finalise(raw, toolUsed)
                },
                abortController.signal,
              )
            } else {
              // ── No tool called: display first-pass response directly ───────
              const raw = firstResult.content ?? ''
              finalise(raw)
            }
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            set({ streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' } })
            return
          }
          toast.error(`API 錯誤：${(err as Error).message}`)
          set({ streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' } })
        }
      },

      // ── Special event interaction ───────────────────────────────────────────

      triggerInteraction: async (interactionId, settings) => {
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

        const eventMsg: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: INTERACTION_PROMPT(interaction.label, character.name),
          timestamp: new Date().toISOString(),
          isEvent: true,
          eventLabel: interaction.label,
          eventEmoji: interaction.emoji,
        }

        const updatedMessages = [...character.messages, eventMsg]

        set((state) => ({
          characters: {
            ...state.characters,
            [activeCharacterId]: { ...character, messages: updatedMessages },
          },
          streaming: { isStreaming: true, streamingCharId: activeCharacterId, currentStreamContent: '' },
        }))

        abortController = new AbortController()

        // Special events always use high-quality model, no tools
        const { model } = resolveModel({
          hasImage: false,
          isSpecialEvent: true,
          usesTool: false,
          isMemorySummary: false,
          userSelectedModel: settings.model,
        })

        try {
          const apiMessages: ApiMessage[] = updatedMessages
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content }))

          await streamAnthropicMessage(
            {
              apiKey: settings.apiKey,
              model,
              systemPrompt: buildSystemPrompt(character),
              messages: apiMessages,
              maxTokens: settings.maxTokens,
              temperature: settings.temperature,
              topP: settings.topP,
            },
            (chunk) => {
              set((s) => ({
                streaming: { ...s.streaming, currentStreamContent: s.streaming.currentStreamContent + chunk },
              }))
            },
            () => {
              const raw = get().streaming.currentStreamContent
              const { clean, delta } = parseAffectionDelta(raw)

              const assistantMsg: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: clean,
                timestamp: new Date().toISOString(),
              }

              const currentChar = get().characters[activeCharacterId]
              const oldAffection = currentChar.affection
              const newAffection = Math.max(0, Math.min(100, oldAffection + delta))

              showAffectionToast(delta, currentChar.name)

              const finalMessages = [...currentChar.messages, assistantMsg]

              set((s) => ({
                characters: {
                  ...s.characters,
                  [activeCharacterId]: {
                    ...s.characters[activeCharacterId],
                    affection: newAffection,
                    messages: finalMessages,
                  },
                },
                streaming: { isStreaming: false, streamingCharId: null, currentStreamContent: '' },
              }))

              if (newAffection >= 100 && oldAffection < 100) {
                get()._triggerConquest(activeCharacterId, settings)
              }

              if (settings.autoTts && clean) speak(clean)
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

      // ── Conquest confession ─────────────────────────────────────────────────

      _triggerConquest: async (charId, settings) => {
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

    // ── Persistence config ──────────────────────────────────────────────────
    {
      name: 'otome-game',
      partialize: (state) => ({
        characters: state.characters,
        activeCharacterId: state.activeCharacterId,
        chronicle: state.chronicle,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<GameStoreState>
        const migratedCharacters = { ...current.characters }
        if (p.characters) {
          for (const id of ['A', 'B', 'C'] as CharId[]) {
            migratedCharacters[id] = {
              ...DEFAULT_CHARACTERS[id],
              ...p.characters[id],
              userPersona: p.characters[id]?.userPersona ?? '',
              // Ensure new fields are present even in old persisted data
              memoryLog: p.characters[id]?.memoryLog ?? [],
              diary: p.characters[id]?.diary ?? [],
            }
          }
        }
        return { ...current, ...p, characters: migratedCharacters }
      },
    },
  ),
)

// ─── Selector helpers ──────────────────────────────────────────────────────────

export const selectActiveCharacter = (state: GameStoreState) =>
  state.characters[state.activeCharacterId]

export const selectStreamingDisplay = (state: GameStoreState) => ({
  isStreaming: state.streaming.isStreaming,
  streamingCharId: state.streaming.streamingCharId,
  displayContent: getDisplayContent(state.streaming.currentStreamContent),
})
