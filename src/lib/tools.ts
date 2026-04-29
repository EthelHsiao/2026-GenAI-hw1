import type { CharId, DiaryEntry } from '@/types'

export const webSearchTool = {
  type: 'function',
  function: {
    name: 'web_search',
    description: '搜尋網路上的最新資訊，當玩家詢問近期新聞、天氣、賽事結果等時使用',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜尋關鍵字，用繁體中文或英文',
        },
      },
      required: ['query'],
    },
  },
} as const

export const diaryTools = [
  {
    type: 'function',
    function: {
      name: 'write_diary',
      description: '將今天發生的重要事情或感受寫入日記。當對話中有讓角色印象深刻的事時使用。',
      parameters: {
        type: 'object',
        properties: {
          entry: {
            type: 'string',
            description: '日記內文，以角色第一人稱書寫，100字以內',
          },
        },
        required: ['entry'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_diary',
      description: '讀取自己最近的日記，回憶過去的事情。當玩家提到過去某件事，或角色想確認某段記憶時使用。',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '要讀取幾條最近的日記，預設 3，最多 5',
          },
        },
        required: [],
      },
    },
  },
] as const

export const allTools = [webSearchTool, ...diaryTools]

export type ToolName = 'web_search' | 'write_diary' | 'read_diary'

export interface ToolExecutionResult {
  name: ToolName
  query: string
  content: string
  statusText: string
}

export interface ToolExecutionContext {
  charId: CharId
  searchApiKey?: string
  addDiaryEntry: (charId: CharId, entry: string) => void
  getDiaryEntries: (charId: CharId, limit: number) => DiaryEntry[]
}

interface ToolCallLike {
  function: {
    name: string
    arguments: string
  }
}

function parseToolArgs<T>(raw: string): T {
  try {
    return JSON.parse(raw || '{}') as T
  } catch {
    return {} as T
  }
}

export async function executeToolCall(
  toolCall: ToolCallLike,
  context: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const name = toolCall.function.name as ToolName

  if (name === 'web_search') {
    const args = parseToolArgs<{ query?: string }>(toolCall.function.arguments)
    const query = args.query?.trim() || '最新資訊'
    return {
      name,
      query,
      statusText: `🔍 搜尋中：${query}...`,
      content: await executeWebSearch(query, context.searchApiKey),
    }
  }

  if (name === 'write_diary') {
    const args = parseToolArgs<{ entry?: string }>(toolCall.function.arguments)
    const entry = args.entry?.trim() || '今天有一些值得記住的心情。'
    context.addDiaryEntry(context.charId, entry)
    return {
      name,
      query: entry,
      statusText: '📓 寫入日記中...',
      content: JSON.stringify({ success: true, message: '日記已寫入' }),
    }
  }

  if (name === 'read_diary') {
    const args = parseToolArgs<{ limit?: number }>(toolCall.function.arguments)
    const limit = Math.min(Math.max(args.limit ?? 3, 1), 5)
    const entries = context.getDiaryEntries(context.charId, limit)
    return {
      name,
      query: `讀取最近 ${limit} 則日記`,
      statusText: '📖 翻閱日記中...',
      content: JSON.stringify(entries),
    }
  }

  return {
    name,
    query: toolCall.function.name,
    statusText: '執行工具中...',
    content: JSON.stringify({ success: false, message: `Unknown tool: ${toolCall.function.name}` }),
  }
}

/**
 * Executes a web search.
 * - If searchApiKey is provided, uses SerpAPI.
 * - Otherwise falls back to DuckDuckGo Instant Answer API via Vite proxy (/ddg).
 * Never throws; returns a human-readable result string.
 */
export async function executeWebSearch(
  query: string,
  searchApiKey?: string,
): Promise<string> {
  try {
    if (searchApiKey?.trim()) {
      const res = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${searchApiKey}&num=3`,
      )
      if (!res.ok) throw new Error('SerpAPI error')
      const data = await res.json() as {
        organic_results?: { title?: string; snippet?: string }[]
      }
      const results = (data.organic_results ?? [])
        .slice(0, 3)
        .map((r) => `${r.title ?? ''}: ${r.snippet ?? ''}`)
      return results.join('\n') || '找不到相關搜尋結果。'
    }

    const res = await fetch(
      `/ddg/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
    )
    if (!res.ok) throw new Error('DuckDuckGo error')
    const data = await res.json() as {
      Abstract?: string
      RelatedTopics?: { Text?: string }[]
    }
    const parts: string[] = []
    if (data.Abstract) parts.push(data.Abstract)
    ;(data.RelatedTopics ?? [])
      .slice(0, 3)
      .forEach((t) => t.Text && parts.push(t.Text))
    return parts.join('\n') || '找不到相關搜尋結果。'
  } catch {
    return '搜尋失敗，請稍後再試。'
  }
}
