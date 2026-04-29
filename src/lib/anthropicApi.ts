import type { ModelId } from '@/types'

const API_BASE = '/api/v1'

// ─── Message types ─────────────────────────────────────────────────────────────

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string  // JSON-encoded string
  }
}

/**
 * Flexible message type covering all roles used with OpenAI-compatible APIs:
 * user / assistant (possibly with tool_calls) / tool (result).
 */
export type ApiMessage =
  | { role: 'user';      content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool';      content: string; tool_call_id: string }

/** Backward-compatible alias for plain user/assistant messages. */
export type AnthropicMessage = { role: 'user' | 'assistant'; content: string }

// ─── Non-streaming call (used for tool-use first pass & memory compression) ───

export interface NonStreamResponse {
  content: string | null
  toolCalls: ToolCall[]
  finishReason: string
}

export async function callQwenNonStream(options: {
  apiKey: string
  model: string
  systemPrompt: string
  messages: ApiMessage[]
  maxTokens: number
  temperature: number
  topP: number
  tools?: readonly object[]
}): Promise<NonStreamResponse> {
  const { apiKey, model, systemPrompt, messages, maxTokens, temperature, topP, tools } = options

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    top_p: topP,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: false,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg =
      (err as { error?: { message?: string } })?.error?.message ??
      `HTTP ${response.status}: ${response.statusText}`
    throw new Error(msg)
  }

  const data = await response.json() as {
    choices?: {
      message?: { content?: string | null; tool_calls?: ToolCall[] }
      finish_reason?: string
    }[]
  }

  const choice = data.choices?.[0]
  return {
    content:      choice?.message?.content ?? null,
    toolCalls:    choice?.message?.tool_calls ?? [],
    finishReason: choice?.finish_reason ?? 'stop',
  }
}

// ─── Streaming call ────────────────────────────────────────────────────────────

export interface StreamOptions {
  apiKey: string
  model: ModelId | string
  systemPrompt: string
  messages: ApiMessage[]
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
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
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

// ─── Suggestion generation ─────────────────────────────────────────────────────

export async function generateSuggestions(options: {
  apiKey: string
  model: ModelId
  systemPrompt: string
  messages: AnthropicMessage[]
  characterName: string
}): Promise<string[]> {
  const { apiKey, model, systemPrompt, messages, characterName } = options
  try {
    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        temperature: 1.0,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
          {
            role: 'user',
            content: `請為玩家生成3個不同風格的簡短回覆建議（每個15字以內），用來回應${characterName}。以JSON陣列格式輸出，例如：["建議1", "建議2", "建議3"]。只輸出JSON陣列，不要其他任何文字。`,
          },
        ],
        stream: false,
      }),
    })
    if (!response.ok) return []
    const data = await response.json() as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content ?? ''
    const match = content.match(/\[[\s\S]*?\]/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) return (parsed as unknown[]).slice(0, 3).map(String)
    }
  } catch {
    // silently fail
  }
  return []
}
