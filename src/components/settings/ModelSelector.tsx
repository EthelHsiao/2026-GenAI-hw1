import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AVAILABLE_MODELS } from '@/constants/models'
import { useState } from 'react'

interface ModelSelectorProps {
  value: string
  onChange: (v: string) => void
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const isKnown = AVAILABLE_MODELS.some((m) => m.value === value)
  const [showCustom, setShowCustom] = useState(!isKnown)

  const handleSelect = (v: string) => {
    if (v === 'custom') {
      setShowCustom(true)
    } else {
      setShowCustom(false)
      onChange(v)
    }
  }

  return (
    <div className="space-y-2">
      <Label>Model</Label>
      <Select
        value={isKnown && !showCustom ? value : 'custom'}
        onValueChange={handleSelect}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_MODELS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showCustom && (
        <Input
          placeholder="Enter model name..."
          value={isKnown ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1"
        />
      )}
    </div>
  )
}
