import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface SystemPromptProps {
  value: string
  onChange: (v: string) => void
}

export function SystemPrompt({ value, onChange }: SystemPromptProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>System Prompt</Label>
        <span className="text-xs text-muted-foreground">{value.length} chars</span>
      </div>
      <Textarea
        rows={4}
        placeholder="You are a helpful assistant."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="resize-none text-sm"
      />
    </div>
  )
}
