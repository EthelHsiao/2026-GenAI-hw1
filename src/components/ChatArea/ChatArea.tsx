import { useEffect, useRef, useState } from 'react'
import { MessageList } from './MessageList'
import { InputBar } from './InputBar'
import { SuggestedReplies } from './SuggestedReplies'
import { useGameStore, selectActiveCharacter, selectStreamingDisplay } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useShallow } from 'zustand/react/shallow'
import { generateSuggestions } from '@/lib/anthropicApi'
import { buildSystemPrompt } from '@/lib/characters'

export function ChatArea() {
  const settings = useSettingsStore((s) => s.settings)
  const character = useGameStore(selectActiveCharacter)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const stopStreaming = useGameStore((s) => s.stopStreaming)
  const { isStreaming, streamingCharId, displayContent } = useGameStore(useShallow(selectStreamingDisplay))

  const isThisCharStreaming = isStreaming && streamingCharId === character.id

  // Suggested replies state
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const wasStreamingRef = useRef(false)

  // Generate suggestions after each AI response
  useEffect(() => {
    if (wasStreamingRef.current && !isThisCharStreaming && character.messages.length > 0 && settings.apiKey) {
      setLoadingSuggestions(true)
      setSuggestions([])
      const apiMessages = character.messages.map((m) => ({ role: m.role, content: m.content }))
      generateSuggestions({
        apiKey: settings.apiKey,
        model: settings.model,
        systemPrompt: buildSystemPrompt(character),
        messages: apiMessages,
        characterName: character.name,
      }).then((replies) => {
        setSuggestions(replies)
        setLoadingSuggestions(false)
      }).catch(() => setLoadingSuggestions(false))
    }
    wasStreamingRef.current = isThisCharStreaming
  }, [isThisCharStreaming]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear suggestions when switching character
  useEffect(() => {
    setSuggestions([])
    setLoadingSuggestions(false)
    wasStreamingRef.current = false
  }, [character.id])

  const handleSend = (text: string) => {
    setSuggestions([])
    setLoadingSuggestions(false)
    sendMessage(text, settings)
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Character header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-card/50">
        <span className="text-lg">{character.emoji}</span>
        <div>
          <span className="text-sm font-semibold">{character.name}</span>
          <p className="text-xs text-muted-foreground">
            {character.affection >= 100
              ? '✨ 已成功攻略！'
              : character.messages.length === 0
                ? '尚未開始對話'
                : `${character.messages.length} 則對話`}
          </p>
        </div>
      </div>

      <MessageList
        messages={character.messages}
        isStreaming={isThisCharStreaming}
        streamingContent={isThisCharStreaming ? displayContent : ''}
        characterEmoji={character.emoji}
        characterName={character.name}
      />

      <SuggestedReplies
        suggestions={suggestions}
        isLoading={loadingSuggestions}
        onSelect={handleSend}
      />

      <InputBar
        onSend={handleSend}
        onStop={stopStreaming}
        isStreaming={isThisCharStreaming}
      />
    </div>
  )
}
