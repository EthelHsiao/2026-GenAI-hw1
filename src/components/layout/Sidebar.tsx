import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/settings/ModelSelector'
import { SystemPrompt } from '@/components/settings/SystemPrompt'
import { ApiParams } from '@/components/settings/ApiParams'
import { RotateCcw, X } from 'lucide-react'
import type { AppSettings } from '@/types/chat'

interface SidebarProps {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => void
  onReset: () => void
  onClose: () => void
}

export function Sidebar({ settings, onUpdate, onReset, onClose }: SidebarProps) {
  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <ModelSelector
            value={settings.model}
            onChange={(v) => onUpdate({ model: v })}
          />

          <Separator />

          <SystemPrompt
            value={settings.systemPrompt}
            onChange={(v) => onUpdate({ systemPrompt: v })}
          />

          <Separator />

          <ApiParams
            params={{
              temperature: settings.temperature,
              max_tokens: settings.max_tokens,
              top_p: settings.top_p,
              frequency_penalty: settings.frequency_penalty,
              presence_penalty: settings.presence_penalty,
            }}
            onChange={onUpdate}
          />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="w-full gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to Defaults
        </Button>
      </div>
    </aside>
  )
}
