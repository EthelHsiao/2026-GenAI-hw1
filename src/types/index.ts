export type CharId = 'A' | 'B' | 'C'

export type ModelId =
  | 'qwen35-397b'

export interface Settings {
  apiKey: string
  model: ModelId
  temperature: number   // 0.0 ~ 2.0, default 0.9
  maxTokens: number     // default 1024
  topP: number          // 0.0 ~ 1.0, default 1.0
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string       // already stripped of [AFFECTION_DELTA:...] for completed messages
  timestamp: string
}

export interface Character {
  id: CharId
  name: string
  emoji: string         // avatar emoji
  color: string         // Tailwind color class for accent
  systemPrompt: string  // template with {affection} placeholder; editable in dev mode
  affection: number     // 0 ~ 100
  messages: Message[]   // sliding window, max 10 completed messages
}

export interface ChronicleEntry {
  id: string
  characterId: CharId
  type: 'first_chat' | 'milestone' | 'conquered'
  description: string
  timestamp: string
}

export interface ConquestData {
  charId: CharId
  confession: string
  isGenerating: boolean
}

// Affection stage
export function getAffectionStage(affection: number): {
  label: string
  color: string
  heart: string
} {
  if (affection <= 30) return { label: '陌生人', color: 'text-slate-400', heart: '🩶' }
  if (affection <= 60) return { label: '朋友', color: 'text-pink-400', heart: '🩷' }
  if (affection <= 85) return { label: '曖昧中', color: 'text-red-400', heart: '❤️' }
  return { label: '已攻略', color: 'text-yellow-400', heart: '💛' }
}

export const MILESTONE_THRESHOLDS = [30, 60, 85, 100] as const

export const AVAILABLE_MODELS: { value: ModelId; label: string }[] = [
  { value: 'qwen35-397b', label: 'Qwen 3.5 397B' },
]
