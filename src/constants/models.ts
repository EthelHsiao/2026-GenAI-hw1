import type { AppSettings } from '@/types/chat'

export const AVAILABLE_MODELS = [
  { value: 'qwen35-397b', label: 'Qwen 3.5 397B' },
  { value: 'qwen2.5-72b', label: 'Qwen 2.5 72B' },
  { value: 'llama3.1-70b', label: 'LLaMA 3.1 70B' },
  { value: 'custom', label: 'Custom Model Name' },
] as const

export const DEFAULT_SETTINGS: AppSettings = {
  model: 'qwen35-397b',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,
  max_tokens: 1024,
  top_p: 1.0,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
}
