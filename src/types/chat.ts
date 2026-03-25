export type Role = 'system' | 'user' | 'assistant'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
  isStreaming?: boolean
}

export interface AppSettings {
  model: string
  systemPrompt: string
  temperature: number       // 0.0–2.0
  max_tokens: number        // 1–4096
  top_p: number             // 0.0–1.0
  frequency_penalty: number // -2.0–2.0
  presence_penalty: number  // -2.0–2.0
}

export interface ChatCompletionChunk {
  id: string
  object: 'chat.completion.chunk'
  choices: Array<{
    delta: { content?: string; role?: Role }
    finish_reason: string | null
    index: number
  }>
}
