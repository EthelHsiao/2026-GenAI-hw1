import type { AppSettings, ChatCompletionChunk, Role } from '@/types/chat'

const API_BASE = '/llm-api'

export interface ApiMessage {
  role: Role
  content: string
}

export async function streamChatCompletion(
  messages: ApiMessage[],
  settings: AppSettings,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal: AbortSignal,
): Promise<void> {
  const apiKey = import.meta.env.VITE_API_KEY as string | undefined

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    signal,
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
      top_p: settings.top_p,
      frequency_penalty: settings.frequency_penalty,
      presence_penalty: settings.presence_penalty,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const msg =
      (errorBody as { error?: { message?: string } })?.error?.message ??
      `HTTP ${response.status}: ${response.statusText}`
    throw new Error(msg)
  }

  if (!response.body) {
    throw new Error('Response body is empty')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed === 'data: [DONE]') {
          onDone()
          return
        }
        if (trimmed.startsWith('data: ')) {
          try {
            const chunk = JSON.parse(trimmed.slice(6)) as ChatCompletionChunk
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) onChunk(text)
          } catch {
            // Malformed chunk — skip
          }
        }
      }
    }
    onDone()
  } finally {
    reader.releaseLock()
  }
}
