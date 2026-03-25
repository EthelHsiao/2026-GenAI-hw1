import { useCallback, useRef, useState } from 'react'
import { streamChatCompletion } from '@/lib/api'
import type { AppSettings, Message, Role } from '@/types/chat'

export function useChat(settings: AppSettings) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim()) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user' as Role,
        content: userText.trim(),
        timestamp: Date.now(),
      }
      const assistantId = crypto.randomUUID()
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant' as Role,
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setIsStreaming(true)
      setError(null)

      // Build history for API including the new user message
      const apiMessages = [
        { role: 'system' as Role, content: settings.systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as Role, content: userText.trim() },
      ]

      abortRef.current = new AbortController()

      try {
        await streamChatCompletion(
          apiMessages,
          settings,
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk }
                  : m,
              ),
            )
          },
          () => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isStreaming: false } : m,
              ),
            )
            setIsStreaming(false)
          },
          abortRef.current.signal,
        )
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message)
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        )
        setIsStreaming(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, settings],
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clearHistory = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setIsStreaming(false)
  }, [])

  return { messages, isStreaming, error, sendMessage, stopStreaming, clearHistory }
}
