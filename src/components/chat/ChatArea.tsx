import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { Button } from '@/components/ui/button'
import { Settings, Trash2, AlertCircle } from 'lucide-react'
import type { Message } from '@/types/chat'

interface ChatAreaProps {
  messages: Message[]
  isStreaming: boolean
  error: string | null
  onSend: (text: string) => void
  onStop: () => void
  onClear: () => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
  modelName: string
}

export function ChatArea({
  messages,
  isStreaming,
  error,
  onSend,
  onStop,
  onClear,
  onToggleSidebar,
  sidebarOpen,
  modelName,
}: ChatAreaProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleSidebar}
              title="Open settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <span className="text-sm font-semibold">My ChatGPT</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            {modelName}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onClear}
          title="Clear conversation"
          disabled={messages.length === 0}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Input */}
      <ChatInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
      />
    </div>
  )
}
