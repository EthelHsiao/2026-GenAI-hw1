import { cn } from '@/lib/utils'
import { getAffectionStage } from '@/types'
import type { Character, CharId } from '@/types'

interface CharacterCardProps {
  character: Character
  isActive: boolean
  isStreaming: boolean
  onClick: (id: CharId) => void
}

export function CharacterCard({ character, isActive, isStreaming, onClick }: CharacterCardProps) {
  const stage = getAffectionStage(character.affection)
  const isConquered = character.affection >= 100

  return (
    <button
      onClick={() => onClick(character.id)}
      className={cn(
        'w-full rounded-xl p-3 text-left transition-all border',
        'hover:bg-accent hover:border-primary/30',
        isActive
          ? 'bg-accent border-primary/50 shadow-sm'
          : 'bg-card border-border',
      )}
    >
      {/* Avatar + Name */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full text-lg flex-shrink-0',
            isActive ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : '',
          )}
        >
          {character.emoji}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold truncate">{character.name}</span>
            {isConquered && <span className="text-xs">💛</span>}
          </div>
          <span className={cn('text-xs', stage.color)}>{stage.label}</span>
        </div>
      </div>

      {/* Affection bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">好感度</span>
          <span className="text-xs font-mono">
            {stage.heart} {character.affection}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              character.affection <= 30
                ? 'bg-slate-400'
                : character.affection <= 60
                  ? 'bg-pink-400'
                  : character.affection <= 85
                    ? 'bg-red-400'
                    : 'bg-yellow-400',
            )}
            style={{ width: `${character.affection}%` }}
          />
        </div>
      </div>

      {/* Streaming indicator */}
      {isActive && isStreaming && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="inline-flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" />
          </span>
          <span>回應中…</span>
        </div>
      )}
    </button>
  )
}
