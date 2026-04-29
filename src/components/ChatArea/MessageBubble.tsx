import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { speak, stopSpeaking } from '@/lib/tts'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  characterEmoji?: string
}

const TOOL_ICON: Record<string, string> = {
  get_weather: '🌤️',
  web_search:  '📡',
  write_diary: '📓',
  read_diary:  '📖',
}

const TOOL_LABEL: Record<string, string> = {
  get_weather: '天氣來源：Open-Meteo',
  web_search:  '資料來源：DuckDuckGo',
  write_diary: '寫了日記',
  read_diary:  '翻了翻日記',
}

export function MessageBubble({ message, isStreaming, characterEmoji }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [isSpeaking, setIsSpeaking] = useState(false)

  const handleTts = () => {
    if (isSpeaking) {
      stopSpeaking()
      setIsSpeaking(false)
    } else {
      setIsSpeaking(true)
      speak(message.content, 'zh-TW', () => setIsSpeaking(false))
    }
  }

  // Special event trigger card
  if (message.isEvent) {
    return (
      <div className="flex justify-center px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/25 px-4 py-1.5 text-sm">
          <span>{message.eventEmoji}</span>
          <span className="font-medium text-primary">{message.eventLabel} 觸發！</span>
          <span>{message.eventEmoji}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2.5 px-4 py-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm">
          {characterEmoji ?? '💬'}
        </div>
      )}

      {/* Bubble + meta */}
      <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        {/* Image preview (user messages with attached image) */}
        {message.imagePreviewUrl && (
          <img
            src={message.imagePreviewUrl}
            alt="傳送的圖片"
            className="max-h-40 rounded-xl border border-border object-cover"
          />
        )}

        {/* Text bubble */}
        {(message.content || isStreaming) && (
          <div
            className={cn(
              'max-w-[72%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
              isUser
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-secondary text-secondary-foreground rounded-tl-sm',
            )}
          >
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
            {isStreaming && <span className="streaming-cursor" />}
          </div>
        )}

        {/* Tool use annotation + TTS button (assistant only) */}
        {!isUser && !isStreaming && (
          <div className="flex items-center gap-2 px-1">
            {message.toolName && (
              <span className="text-[10px] text-muted-foreground">
                {TOOL_ICON[message.toolName] ?? '🔧'}{' '}
                {TOOL_LABEL[message.toolName] ?? message.toolName}
                {message.toolQuery ? `：${message.toolQuery}` : ''}
              </span>
            )}
            {message.content && (
              <button
                onClick={handleTts}
                title={isSpeaking ? '停止朗讀' : '朗讀此訊息'}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSpeaking
                  ? <VolumeX className="h-3.5 w-3.5" />
                  : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Streaming placeholder bubble shown during active streaming */
export function StreamingBubble({
  content,
  characterEmoji,
}: {
  content: string
  characterEmoji?: string
}) {
  return (
    <MessageBubble
      message={{ id: '__streaming__', role: 'assistant', content, timestamp: '' }}
      isStreaming={true}
      characterEmoji={characterEmoji}
    />
  )
}
