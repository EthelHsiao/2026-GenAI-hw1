import { useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Square } from 'lucide-react'

interface ChatInputProps {
  onSend: (text: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onSend(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm p-3">
      <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <Textarea
          ref={textareaRef}
          rows={1}
          placeholder="Message… (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            autoResize()
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 min-h-[24px] max-h-40"
        />
        {isStreaming ? (
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={onStop}
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || disabled}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-center text-xs text-muted-foreground">
        AI can make mistakes. Verify important info.
      </p>
    </div>
  )
}
