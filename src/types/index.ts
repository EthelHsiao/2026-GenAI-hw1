export type CharId = 'A' | 'B' | 'C'

export type ModelId =
  | 'qwen35-397b'
  | 'qwen35-4b'
  | 'gemini-2.5-flash'

export interface Settings {
  apiKey: string
  model: ModelId
  temperature: number   // 0.0 ~ 2.0, default 0.9
  maxTokens: number     // default 1024
  topP: number          // 0.0 ~ 1.0, default 1.0
  geminiApiKey: string  // Google AI Studio key for image input
  searchApiKey: string  // Optional SerpAPI key for web search
  autoTts: boolean      // Auto-read aloud assistant responses
}

export interface MemoryEntry {
  id: string
  summary: string       // LLM-compressed summary text
  timestamp: string     // Time of compression
  messageCount: number  // Number of messages covered
}

export interface DiaryEntry {
  id: string
  entry: string         // Diary text in character's first person
  timestamp: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string       // already stripped of [AFFECTION_DELTA:...] for completed messages
  timestamp: string
  isEvent?: boolean     // special interaction event trigger
  eventLabel?: string   // display label e.g. "約會"
  eventEmoji?: string   // display emoji e.g. "🌸"
  imagePreviewUrl?: string  // Object URL for image preview (user messages with image)
  toolName?: string         // tool that was invoked ('get_weather' | 'web_search' | 'write_diary' | 'read_diary')
  toolQuery?: string        // search query or diary operation description
}

export interface Character {
  id: CharId
  name: string
  emoji: string         // avatar emoji
  color: string         // Tailwind color class for accent
  systemPrompt: string  // template with {affection} placeholder; editable in dev mode
  affection: number     // 0 ~ 100
  messages: Message[]   // conversation history (no hard cap; compressed into memoryLog)
  userPersona: string   // player's self-introduction for this character
  memoryLog: MemoryEntry[]  // up to 20 compressed memory summaries (FIFO)
  diary: DiaryEntry[]       // up to 30 diary entries (FIFO)
}

export interface ImageInputData {
  base64: string        // base64-encoded image, no data: prefix
  mimeType: string      // 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  previewUrl: string    // Object URL for display (revoked after use)
}

export interface Interaction {
  id: string
  label: string
  emoji: string
  minAffection: number
}

export const INTERACTIONS: Interaction[] = [
  { id: 'date',       label: '約會', emoji: '🌸', minAffection: 30  },
  { id: 'hold_hands', label: '牽手', emoji: '🤝', minAffection: 60  },
  { id: 'hug',        label: '擁抱', emoji: '🫂', minAffection: 85  },
  { id: 'kiss',       label: '親吻', emoji: '💋', minAffection: 100 },
]

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

export interface RoutingContext {
  hasImage: boolean
  isSpecialEvent: boolean
  usesTool: boolean        // true when a tool was called and we're making the final LLM call
  isMemorySummary: boolean
  userSelectedModel: ModelId
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

// Only Qwen models in manual selector; Gemini is routed automatically
export const AVAILABLE_MODELS: { value: ModelId; label: string }[] = [
  { value: 'qwen35-397b', label: 'Qwen 3.5 397B' },
  { value: 'qwen35-4b',   label: 'Qwen 3.5 4B' },
]
