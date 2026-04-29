import type { CharId, DiaryEntry } from '@/types'

export const weatherTool = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: '查詢指定城市或地點的即時天氣。當玩家詢問今天、現在、目前的天氣、溫度、下雨、風速時使用。',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: '城市或地點名稱，例如：台北、Tokyo、New York',
        },
      },
      required: ['location'],
    },
  },
} as const

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

export const allTools = [weatherTool, webSearchTool, ...diaryTools]

export type ToolName = 'get_weather' | 'web_search' | 'write_diary' | 'read_diary'

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

  if (name === 'get_weather') {
    const args = parseToolArgs<{ location?: string }>(toolCall.function.arguments)
    const location = args.location?.trim() || '台北'
    return {
      name,
      query: location,
      statusText: `🌤️ 查詢天氣中：${location}...`,
      content: await executeWeatherLookup(location),
    }
  }

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

function weatherCodeText(code: number | undefined): string {
  if (code === undefined) return '未知'
  if (code === 0) return '晴朗'
  if ([1, 2, 3].includes(code)) return '多雲'
  if ([45, 48].includes(code)) return '有霧'
  if ([51, 53, 55, 56, 57].includes(code)) return '毛毛雨'
  if ([61, 63, 65, 66, 67].includes(code)) return '下雨'
  if ([71, 73, 75, 77].includes(code)) return '下雪'
  if ([80, 81, 82].includes(code)) return '陣雨'
  if ([85, 86].includes(code)) return '陣雪'
  if ([95, 96, 99].includes(code)) return '雷雨'
  return `天氣代碼 ${code}`
}

const LOCATION_ALIASES: Record<string, {
  name: string
  country: string
  latitude: number
  longitude: number
}> = {
  台北: { name: 'Taipei', country: 'Taiwan', latitude: 25.0478, longitude: 121.5319 },
  臺北: { name: 'Taipei', country: 'Taiwan', latitude: 25.0478, longitude: 121.5319 },
  新北: { name: 'New Taipei', country: 'Taiwan', latitude: 25.0169, longitude: 121.4628 },
  桃園: { name: 'Taoyuan', country: 'Taiwan', latitude: 24.9937, longitude: 121.3009 },
  台中: { name: 'Taichung', country: 'Taiwan', latitude: 24.1477, longitude: 120.6736 },
  臺中: { name: 'Taichung', country: 'Taiwan', latitude: 24.1477, longitude: 120.6736 },
  台南: { name: 'Tainan', country: 'Taiwan', latitude: 22.9999, longitude: 120.2269 },
  臺南: { name: 'Tainan', country: 'Taiwan', latitude: 22.9999, longitude: 120.2269 },
  高雄: { name: 'Kaohsiung', country: 'Taiwan', latitude: 22.6273, longitude: 120.3014 },
  新竹: { name: 'Hsinchu', country: 'Taiwan', latitude: 24.8138, longitude: 120.9675 },
  基隆: { name: 'Keelung', country: 'Taiwan', latitude: 25.1276, longitude: 121.7392 },
}

export async function executeWeatherLookup(location: string): Promise<string> {
  try {
    const normalizedLocation = location.trim()
    const alias = LOCATION_ALIASES[normalizedLocation]
    let place: {
      name?: string
      country?: string
      admin1?: string
      latitude?: number
      longitude?: number
    } | undefined = alias

    if (!place) {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(normalizedLocation)}&count=1&language=zh&format=json`,
      )
      if (!geoRes.ok) throw new Error('Geocoding failed')

      const geoData = await geoRes.json() as {
        results?: {
          name?: string
          country?: string
          admin1?: string
          latitude?: number
          longitude?: number
        }[]
      }
      place = geoData.results?.[0]
    }

    if (place?.latitude === undefined || place?.longitude === undefined) {
      return JSON.stringify({
        success: false,
        source: 'Open-Meteo',
        message: `找不到「${location}」的位置資料。`,
      })
    }

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`,
    )
    if (!weatherRes.ok) throw new Error('Weather lookup failed')

    const weatherData = await weatherRes.json() as {
      current?: {
        time?: string
        temperature_2m?: number
        apparent_temperature?: number
        relative_humidity_2m?: number
        precipitation?: number
        rain?: number
        weather_code?: number
        wind_speed_10m?: number
      }
      current_units?: Record<string, string>
    }
    const current = weatherData.current
    if (!current) {
      return JSON.stringify({
        success: false,
        source: 'Open-Meteo',
        message: `Open-Meteo 沒有回傳「${location}」的即時天氣。`,
      })
    }

    return JSON.stringify({
      success: true,
      source: 'Open-Meteo',
      location: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
      time: current.time,
      condition: weatherCodeText(current.weather_code),
      temperature: `${current.temperature_2m}${weatherData.current_units?.temperature_2m ?? '°C'}`,
      apparentTemperature: `${current.apparent_temperature}${weatherData.current_units?.apparent_temperature ?? '°C'}`,
      humidity: `${current.relative_humidity_2m}${weatherData.current_units?.relative_humidity_2m ?? '%'}`,
      precipitation: `${current.precipitation}${weatherData.current_units?.precipitation ?? 'mm'}`,
      rain: `${current.rain}${weatherData.current_units?.rain ?? 'mm'}`,
      windSpeed: `${current.wind_speed_10m}${weatherData.current_units?.wind_speed_10m ?? 'km/h'}`,
      instruction: '請用角色人格自然轉述這份天氣資料，不要直接貼 JSON。',
    })
  } catch {
    return JSON.stringify({
      success: false,
      source: 'Open-Meteo',
      message: '天氣工具查詢失敗，請稍後再試。',
    })
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
