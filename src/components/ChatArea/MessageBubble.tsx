import { cn } from '@/lib/utils'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  characterEmoji?: string
}

export function MessageBubble({ message, isStreaming, characterEmoji }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-2.5 px-4 py-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm">
          {characterEmoji ?? '💬'}
        </div>
      )}

      {/* Bubble */}
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
