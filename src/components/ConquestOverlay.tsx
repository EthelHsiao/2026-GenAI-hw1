import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useGameStore } from '@/stores/gameStore'
import { X } from 'lucide-react'

const PETALS = ['🌸', '✨', '⭐', '🌟', '💫', '🌺', '🌼']

interface PetalProps {
  left: string
  duration: string
  delay: string
  size: string
  emoji: string
  drift: string
}

function Petal({ left, duration, delay, size, emoji, drift }: PetalProps) {
  return (
    <div
      className="petal select-none"
      style={
        {
          left,
          '--duration': duration,
          '--delay': delay,
          '--size': size,
          '--drift': drift,
        } as React.CSSProperties
      }
    >
      {emoji}
    </div>
  )
}

export function ConquestOverlay() {
  const conquestData = useGameStore((s) => s.conquestData)
  const closeConquest = useGameStore((s) => s.closeConquest)
  const characters = useGameStore((s) => s.characters)

  const petals = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${(i / 24) * 100 + Math.random() * 4}%`,
        duration: `${3 + Math.random() * 3}s`,
        delay: `${Math.random() * 4}s`,
        size: `${16 + Math.random() * 20}px`,
        emoji: PETALS[i % PETALS.length],
        drift: `${(Math.random() - 0.5) * 120}px`,
      })),
    [],
  )

  if (!conquestData) return null

  const character = characters[conquestData.charId]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={closeConquest}
    >
      {/* Falling petals */}
      {petals.map((p) => (
        <Petal
          key={p.id}
          left={p.left}
          duration={p.duration}
          delay={p.delay}
          size={p.size}
          emoji={p.emoji}
          drift={p.drift}
        />
      ))}

      {/* Confession card */}
      <div
        className="relative z-10 mx-4 max-w-md rounded-2xl border-2 border-yellow-400/60 bg-card p-6 shadow-2xl shadow-yellow-400/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7"
          onClick={closeConquest}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Header */}
        <div className="mb-4 text-center">
          <div className="text-4xl mb-2">{character.emoji}</div>
          <p className="gold-shimmer text-lg font-bold">攻略成功！</p>
          <p className="text-xs text-muted-foreground">{character.name} 的告白</p>
        </div>

        {/* Confession text */}
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-4 text-sm leading-relaxed">
          {conquestData.isGenerating ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce" />
              </span>
              <span className="text-xs">正在生成告白中…</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap italic">{conquestData.confession}</p>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          點擊任意處關閉
        </p>
      </div>
    </div>
  )
}
