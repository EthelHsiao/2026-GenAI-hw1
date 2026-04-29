import { ScrollArea } from '@/components/ui/scroll-area'
import type { DiaryEntry } from '@/types'

interface DiaryPanelProps {
  entries: DiaryEntry[]
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function DiaryPanel({ entries }: DiaryPanelProps) {
  const newestFirst = [...entries].reverse()

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Diary
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground">{entries.length}/30</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {newestFirst.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-3 py-4 text-xs leading-relaxed text-muted-foreground">
            No diary entries yet. The character can write or read diary entries through tool use.
          </div>
        ) : (
          <div className="space-y-2 pr-2">
            {newestFirst.map((entry) => (
              <article key={entry.id} className="rounded-md border border-border bg-background p-2">
                <div className="mb-1 text-[10px] text-muted-foreground">
                  {formatTime(entry.timestamp)}
                </div>
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                  {entry.entry}
                </p>
              </article>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
