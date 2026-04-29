import { AffectionDisplay } from './AffectionDisplay'
import { ChronicleTimeline } from './ChronicleTimeline'
import { InteractionsPanel } from './InteractionsPanel'
import { MemoryLogPanel } from './MemoryLogPanel'
import { DiaryPanel } from './DiaryPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGameStore, selectActiveCharacter, selectStreamingDisplay } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useShallow } from 'zustand/react/shallow'

export function SidePanel() {
  const character = useGameStore(selectActiveCharacter)
  const settings = useSettingsStore((s) => s.settings)
  const { isStreaming, streamingCharId } = useGameStore(useShallow(selectStreamingDisplay))
  const triggerInteraction = useGameStore((s) => s.triggerInteraction)

  const isThisCharStreaming = isStreaming && streamingCharId === character.id

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-l border-border bg-card">
      <AffectionDisplay character={character} />
      <InteractionsPanel
        character={character}
        isStreaming={isThisCharStreaming}
        onTrigger={(id) => triggerInteraction(id, settings)}
      />
      <Tabs defaultValue="chronicle" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 my-2 grid h-8 grid-cols-3">
          <TabsTrigger value="chronicle" className="px-2 text-xs">Log</TabsTrigger>
          <TabsTrigger value="memory" className="px-2 text-xs">Memory</TabsTrigger>
          <TabsTrigger value="diary" className="px-2 text-xs">Diary</TabsTrigger>
        </TabsList>
        <TabsContent value="chronicle" className="mt-0 min-h-0 flex-1">
          <ChronicleTimeline />
        </TabsContent>
        <TabsContent value="memory" className="mt-0 min-h-0 flex-1">
          <MemoryLogPanel entries={character.memoryLog} />
        </TabsContent>
        <TabsContent value="diary" className="mt-0 min-h-0 flex-1">
          <DiaryPanel entries={character.diary} />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
