import { MessageList } from './MessageList'
import { InputBar } from './InputBar'
import { useGameStore, selectActiveCharacter, selectStreamingDisplay } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useShallow } from 'zustand/react/shallow'

export function ChatArea() {
  const settings = useSettingsStore((s) => s.settings)
  const character = useGameStore(selectActiveCharacter)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const stopStreaming = useGameStore((s) => s.stopStreaming)
  const { isStreaming, streamingCharId, displayContent } = useGameStore(useShallow(selectStreamingDisplay))

  const isThisCharStreaming = isStreaming && streamingCharId === character.id

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

      <InputBar
        onSend={(text) => sendMessage(text, settings)}
        onStop={stopStreaming}
        isStreaming={isThisCharStreaming}
      />
    </div>
  )
}
