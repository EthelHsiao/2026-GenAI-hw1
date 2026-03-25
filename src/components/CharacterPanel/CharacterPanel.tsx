import { CharacterCard } from './CharacterCard'
import { useGameStore, selectStreamingDisplay } from '@/stores/gameStore'
import { useShallow } from 'zustand/react/shallow'
import type { CharId } from '@/types'

export function CharacterPanel() {
  const { characters, activeCharacterId, setActiveCharacter } = useGameStore(
    useShallow((s) => ({
      characters: s.characters,
      activeCharacterId: s.activeCharacterId,
      setActiveCharacter: s.setActiveCharacter,
    }))
  )
  const { isStreaming, streamingCharId } = useGameStore(useShallow(selectStreamingDisplay))

  const charIds: CharId[] = ['A', 'B', 'C']

  return (
    <aside className="flex w-48 flex-shrink-0 flex-col gap-2 border-r border-border bg-card p-3">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        角色
      </h2>
      {charIds.map((id) => (
        <CharacterCard
          key={id}
          character={characters[id]}
          isActive={activeCharacterId === id}
          isStreaming={isStreaming && streamingCharId === id}
          onClick={setActiveCharacter}
        />
      ))}
    </aside>
  )
}
