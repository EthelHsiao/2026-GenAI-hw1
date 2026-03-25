import { cn } from '@/lib/utils'
import { getAffectionStage } from '@/types'
import type { Character } from '@/types'

interface AffectionDisplayProps {
  character: Character
}

export function AffectionDisplay({ character }: AffectionDisplayProps) {
  const stage = getAffectionStage(character.affection)
  const isConquered = character.affection >= 100

  return (
    <div className="p-4 border-b border-border space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          好感度
        </span>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', stage.color, 'bg-muted')}>
          {stage.label}
        </span>
      </div>

      {/* Character info */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{character.emoji}</span>
        <div>
          <p className="text-sm font-semibold">{character.name}</p>
          <p className={cn('text-xs font-bold', stage.color)}>
            {stage.heart} {character.affection} / 100
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden relative">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              character.affection <= 30
                ? 'bg-slate-400'
                : character.affection <= 60
                  ? 'bg-pink-400'
                  : character.affection <= 85
                    ? 'bg-red-400'
                    : 'bg-gradient-to-r from-yellow-400 to-amber-300',
            )}
            style={{ width: `${character.affection}%` }}
          />
        </div>
        {/* Milestone markers */}
        <div className="relative h-4">
          {[30, 60, 85].map((m) => (
            <div
              key={m}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${m}%`, transform: 'translateX(-50%)' }}
            >
              <div className={cn('w-px h-2', character.affection >= m ? 'bg-foreground/40' : 'bg-border')} />
              <span className="text-[9px] text-muted-foreground">{m}</span>
            </div>
          ))}
        </div>
      </div>

      {isConquered && (
        <p className="text-center text-xs font-medium gold-shimmer py-1">
          ✨ 攻略成功！ ✨
        </p>
      )}
    </div>
  )
}
