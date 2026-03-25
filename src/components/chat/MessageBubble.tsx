import { StreamingCursor } from './StreamingCursor'
import type { Message } from '@/types/chat'
import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 py-4 px-4',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-secondary text-secondary-foreground rounded-tl-sm',
        )}
      >
        {message.content ? (
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
        ) : (
          !message.isStreaming && (
            <span className="text-muted-foreground italic text-xs">
              (empty response)
            </span>
          )
        )}
        {message.isStreaming && <StreamingCursor />}
      </div>
    </div>
  )
}
