import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from './MessageBubble'
import type { Message } from '@/types/chat'
import { Bot } from 'lucide-react'

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Bot className="h-12 w-12 opacity-20" />
        <p className="text-sm">Start a conversation</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col divide-y divide-border/40">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
      <div ref={bottomRef} className="h-4" />
    </ScrollArea>
  )
}
