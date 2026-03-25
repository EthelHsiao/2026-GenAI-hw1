import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INTERACTIONS } from '@/types'
import type { Character } from '@/types'

interface InteractionsPanelProps {
  character: Character
  isStreaming: boolean
  onTrigger: (interactionId: string) => void
}

export function InteractionsPanel({ character, isStreaming, onTrigger }: InteractionsPanelProps) {
  return (
    <div className="p-3 border-t border-border">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        解鎖互動
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        {INTERACTIONS.map(({ id, label, emoji, minAffection }) => {
          const unlocked = character.affection >= minAffection
          return (
            <button
              key={id}
              disabled={!unlocked || isStreaming}
              onClick={() => onTrigger(id)}
              title={unlocked ? `觸發「${label}」事件` : `好感度需達 ${minAffection} 才可解鎖`}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs border transition-all',
                unlocked && !isStreaming
                  ? 'bg-card border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary cursor-pointer'
                  : 'bg-muted/30 border-border/40 text-muted-foreground/40 cursor-not-allowed',
              )}
            >
              <span className="text-sm">{emoji}</span>
              <span className="font-medium">{label}</span>
              {unlocked ? null : (
                <span className="ml-auto flex items-center gap-0.5 text-[9px]">
                  <Lock className="h-2.5 w-2.5" />
                  {minAffection}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
