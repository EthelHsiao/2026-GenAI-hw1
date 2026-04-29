import type { ModelId, RoutingContext } from '@/types'

export type ApiBackend = 'qwen' | 'gemini'

export interface RoutingResult {
  model: ModelId
  backend: ApiBackend
}

/**
 * Resolves which model and API backend to use, in priority order:
 * 1. Image input  → gemini-2.5-flash (Google Gemini)
 * 2. Special event → qwen35-397b     (high-quality emotional text)
 * 3. Tool use      → qwen35-397b     (function calling capable)
 * 4. Memory summary→ qwen35-4b       (lightweight summarisation)
 * 5. Default       → user's selection (Qwen)
 */
export function resolveModel(context: RoutingContext): RoutingResult {
  const { hasImage, isSpecialEvent, usesTool, isMemorySummary, userSelectedModel } = context
  if (hasImage)        return { model: 'gemini-2.5-flash', backend: 'gemini' }
  if (isSpecialEvent)  return { model: 'qwen35-397b',      backend: 'qwen'   }
  if (usesTool)        return { model: 'qwen35-397b',      backend: 'qwen'   }
  if (isMemorySummary) return { model: 'qwen35-4b',        backend: 'qwen'   }
  return { model: userSelectedModel,                        backend: 'qwen'   }
}
