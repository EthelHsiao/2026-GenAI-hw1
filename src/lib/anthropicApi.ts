import type { ModelId } from '@/types'

const API_BASE = '/api/v1'

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StreamOptions {
  apiKey: string
  model: ModelId
  systemPrompt: string
  messages: AnthropicMessage[]
  maxTokens: number
  temperature: number
  topP: number
}

export async function streamAnthropicMessage(
  options: StreamOptions,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal: AbortSignal,
): Promise<void> {
  const { apiKey, model, systemPrompt, messages, maxTokens, temperature, topP } = options

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg =
      (body as { error?: { message?: string } })?.error?.message ??
      `HTTP ${response.status}: ${response.statusText}`
    throw new Error(msg)
  }

  if (!response.body) throw new Error('Response body is empty')

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
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          onDone()
          return
        }
        try {
          const parsed = JSON.parse(data) as {
            choices?: { delta?: { content?: string }; finish_reason?: string | null }[]
          }
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) onChunk(delta)
          if (parsed.choices?.[0]?.finish_reason === 'stop') {
            onDone()
            return
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
    onDone()
  } finally {
    reader.releaseLock()
  }
}
