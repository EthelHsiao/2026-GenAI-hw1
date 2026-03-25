import { SettingsModal } from './SettingsModal'
import { Heart } from 'lucide-react'

export function Navbar() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-primary" fill="currentColor" />
        <span className="font-bold text-sm tracking-wide">LLM 乙女攻略</span>
      </div>
      <SettingsModal />
    </header>
  )
}
