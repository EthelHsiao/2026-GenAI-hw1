import { AffectionDisplay } from './AffectionDisplay'
import { ChronicleTimeline } from './ChronicleTimeline'
import { useGameStore, selectActiveCharacter } from '@/stores/gameStore'

export function SidePanel() {
  const character = useGameStore(selectActiveCharacter)

  return (
    <aside className="flex w-52 flex-shrink-0 flex-col border-l border-border bg-card">
      <AffectionDisplay character={character} />
      <ChronicleTimeline />
    </aside>
  )
}
