import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { AppSettings } from '@/types/chat'

type ApiParamKeys = Omit<AppSettings, 'model' | 'systemPrompt'>

interface ApiParamsProps {
  params: ApiParamKeys
  onChange: (patch: Partial<ApiParamKeys>) => void
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-mono text-muted-foreground">
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  )
}

export function ApiParams({ params, onChange }: ApiParamsProps) {
  return (
    <div className="space-y-4">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        API Parameters
      </Label>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Max Tokens</Label>
          <span className="text-xs font-mono text-muted-foreground">
            {params.max_tokens}
          </span>
        </div>
        <Input
          type="number"
          min={1}
          max={8192}
          value={params.max_tokens}
          onChange={(e) =>
            onChange({ max_tokens: Math.max(1, parseInt(e.target.value) || 1) })
          }
          className="h-7 text-xs"
        />
      </div>

      <Separator />

      <ParamSlider
        label="Temperature"
        value={params.temperature}
        min={0}
        max={2}
        step={0.01}
        onChange={(v) => onChange({ temperature: v })}
      />

      <ParamSlider
        label="Top P"
        value={params.top_p}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => onChange({ top_p: v })}
      />

      <Separator />

      <ParamSlider
        label="Frequency Penalty"
        value={params.frequency_penalty}
        min={-2}
        max={2}
        step={0.01}
        onChange={(v) => onChange({ frequency_penalty: v })}
      />

      <ParamSlider
        label="Presence Penalty"
        value={params.presence_penalty}
        min={-2}
        max={2}
        step={0.01}
        onChange={(v) => onChange({ presence_penalty: v })}
      />
    </div>
  )
}
