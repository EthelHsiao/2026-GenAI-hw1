import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useGameStore } from '@/stores/gameStore'
import type { ChronicleEntry, CharId } from '@/types'
import { cn } from '@/lib/utils'

const CHAR_NAMES: Record<CharId, string> = { A: '陸晨曦', B: '白澤', C: '司夜' }
const CHAR_EMOJIS: Record<CharId, string> = { A: '🧊', B: '☀️', C: '🌙' }

function EntryCard({ entry }: { entry: ChronicleEntry }) {
  const icon = entry.type === 'conquered' ? '💛' : entry.type === 'milestone' ? '⭐' : '💬'
  const date = new Date(entry.timestamp)
  const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

  return (
    <div className="flex gap-2 text-xs">
      {/* Timeline dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={cn(
          'h-5 w-5 rounded-full flex items-center justify-center text-xs',
          entry.type === 'conquered' ? 'bg-yellow-400/20' : 'bg-muted',
        )}>
          {icon}
        </div>
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      {/* Content */}
      <div className="pb-3 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <span>{CHAR_EMOJIS[entry.characterId]}</span>
          <span className="font-medium">{CHAR_NAMES[entry.characterId]}</span>
        </div>
        <p className="text-muted-foreground leading-snug">{entry.description}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{timeStr}</p>
      </div>
    </div>
  )
}

export function ChronicleTimeline() {
  const chronicle = useGameStore((s) => s.chronicle)
  const sorted = [...chronicle].reverse()

  const filterChars: Array<'all' | CharId> = ['all', 'A', 'B', 'C']

  return (
    <div className="flex flex-1 flex-col min-h-0 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        大事記
      </h3>

      <Tabs defaultValue="all" className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-full grid grid-cols-4 h-7 mb-2">
          <TabsTrigger value="all" className="text-xs px-1">全部</TabsTrigger>
          {(['A', 'B', 'C'] as CharId[]).map((id) => (
            <TabsTrigger key={id} value={id} className="text-xs px-1">
              {CHAR_EMOJIS[id]}
            </TabsTrigger>
          ))}
        </TabsList>

        {filterChars.map((filter) => (
          <TabsContent key={filter} value={filter} className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              {sorted.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  尚無紀錄
                </p>
              ) : (
                <div className="space-y-0 pr-2">
                  {sorted
                    .filter((e) => filter === 'all' || e.characterId === filter)
                    .map((entry) => (
                      <EntryCard key={entry.id} entry={entry} />
                    ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
