import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble, StreamingBubble } from './MessageBubble'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  streamingContent: string
  characterEmoji: string
  characterName: string
}

export function MessageList({
  messages,
  isStreaming,
  streamingContent,
  characterEmoji,
  characterName,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [messages, streamingContent])

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="text-4xl">{characterEmoji}</div>
        <p className="text-sm">開始和 {characterName} 對話吧！</p>
        <p className="text-xs opacity-60">發送訊息即可開始</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="py-2">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            characterEmoji={characterEmoji}
          />
        ))}
        {isStreaming && (
          <StreamingBubble content={streamingContent} characterEmoji={characterEmoji} />
        )}
        <div ref={bottomRef} className="h-2" />
      </div>
    </ScrollArea>
  )
}
