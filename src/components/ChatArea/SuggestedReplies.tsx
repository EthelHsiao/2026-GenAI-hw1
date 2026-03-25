import { Sparkles } from 'lucide-react'

interface SuggestedRepliesProps {
  suggestions: string[]
  isLoading: boolean
  onSelect: (text: string) => void
}

export function SuggestedReplies({ suggestions, isLoading, onSelect }: SuggestedRepliesProps) {
  if (!isLoading && suggestions.length === 0) return null

  return (
    <div className="px-3 pb-2 flex items-center gap-2 flex-wrap">
      <Sparkles className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      {isLoading ? (
        <span className="text-xs text-muted-foreground animate-pulse">生成建議中…</span>
      ) : (
        suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            className="text-xs bg-secondary hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 rounded-full px-3 py-1.5 transition-colors max-w-[200px] truncate"
          >
            {s}
          </button>
        ))
      )}
    </div>
  )
}
