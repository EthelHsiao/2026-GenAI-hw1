import { AffectionDisplay } from './AffectionDisplay'
import { ChronicleTimeline } from './ChronicleTimeline'
import { InteractionsPanel } from './InteractionsPanel'
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
    <aside className="flex w-52 flex-shrink-0 flex-col border-l border-border bg-card">
      <AffectionDisplay character={character} />
      <InteractionsPanel
        character={character}
        isStreaming={isThisCharStreaming}
        onTrigger={(id) => triggerInteraction(id, settings)}
      />
      <ChronicleTimeline />
    </aside>
  )
}
