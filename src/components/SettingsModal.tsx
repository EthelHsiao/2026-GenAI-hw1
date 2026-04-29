import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings, Eye, EyeOff, Code2 } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useGameStore } from '@/stores/gameStore'
import { useShallow } from 'zustand/react/shallow'
import { AVAILABLE_MODELS } from '@/types'
import type { ModelId } from '@/types'

export function SettingsModal() {
  const { settings, updateSettings } = useSettingsStore()
  const { activeCharacterId, characters } = useGameStore(
    useShallow((s) => ({ activeCharacterId: s.activeCharacterId, characters: s.characters }))
  )
  const resetCharacter = useGameStore((s) => s.resetCharacter)
  const setAffection = useGameStore((s) => s.setAffection)
  const updateUserPersona = useGameStore((s) => s.updateUserPersona)

  const [showKey, setShowKey] = useState(false)
  const [devMode, setDevMode] = useState(false)
  const [localPrompt, setLocalPrompt] = useState(characters[activeCharacterId].systemPrompt)
  const [localPersona, setLocalPersona] = useState(characters[activeCharacterId].userPersona)

  const activeChar = characters[activeCharacterId]

  const handleSavePrompt = () => {
    useGameStore.setState((state) => ({
      characters: {
        ...state.characters,
        [activeCharacterId]: {
          ...state.characters[activeCharacterId],
          systemPrompt: localPrompt,
        },
      },
    }))
  }

  const handleSavePersona = () => {
    updateUserPersona(activeCharacterId, localPersona)
  }

  const handleOpenDevMode = () => {
    setDevMode((v) => !v)
    setLocalPrompt(activeChar.systemPrompt)
    setLocalPersona(activeChar.userPersona)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚙️ 設定</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* API Key */}
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Bearer Token..."
                value={settings.apiKey}
                onChange={(e) => updateSettings({ apiKey: e.target.value })}
                className="flex-1 font-mono text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowKey((v) => !v)}
                className="flex-shrink-0"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              🔒 API Key 僅儲存在本機 localStorage，不會傳送到第三方
            </p>
          </div>

          <Separator />

          {/* Gemini / tools */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Gemini API Key</Label>
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Google AI Studio key..."
                value={settings.geminiApiKey}
                onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Used automatically when an image is attached.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Search API Key</Label>
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Optional SerpAPI key..."
                value={settings.searchApiKey}
                onChange={(e) => updateSettings({ searchApiKey: e.target.value })}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Empty value uses DuckDuckGo through the local Vite proxy.
              </p>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">Auto TTS</span>
              <input
                type="checkbox"
                checked={settings.autoTts}
                onChange={(e) => updateSettings({ autoTts: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
            </label>
          </div>

          <Separator />

          {/* Model */}
          <div className="space-y-2">
            <Label>模型</Label>
            <Select
              value={settings.model}
              onValueChange={(v) => updateSettings({ model: v as ModelId })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">Temperature</Label>
              <span className="text-xs font-mono text-muted-foreground">
                {settings.temperature.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={2}
              step={0.01}
              value={[settings.temperature]}
              onValueChange={([v]) => updateSettings({ temperature: v })}
            />
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label className="text-sm">Max Tokens</Label>
            <Input
              type="number"
              min={100}
              max={4096}
              value={settings.maxTokens}
              onChange={(e) =>
                updateSettings({ maxTokens: Math.max(100, parseInt(e.target.value) || 100) })
              }
              className="h-8 text-sm"
            />
          </div>

          {/* Top P */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">Top P</Label>
              <span className="text-xs font-mono text-muted-foreground">
                {settings.topP.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[settings.topP]}
              onValueChange={([v]) => updateSettings({ topP: v })}
            />
          </div>

          <Separator />

          {/* User Persona */}
          <div className="space-y-2">
            <Label className="text-sm">
              {activeChar.emoji} {activeChar.name} — 關於你的自我介紹
            </Label>
            <Textarea
              rows={3}
              placeholder={`讓 ${activeChar.name} 認識你，例如：我叫小美，喜歡音樂和貓咪…`}
              value={localPersona}
              onChange={(e) => setLocalPersona(e.target.value)}
              className="text-xs resize-none"
            />
            <Button size="sm" onClick={handleSavePersona} className="w-full" variant="outline">
              儲存自我介紹
            </Button>
          </div>

          <Separator />

          {/* Developer Mode */}
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDevMode}
              className="gap-2 w-full"
            >
              <Code2 className="h-3.5 w-3.5" />
              {devMode ? '關閉開發者模式' : '開發者模式'}
            </Button>

            {devMode && (
              <div className="space-y-3">
                {/* Affection Slider */}
                <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">
                      {activeChar.emoji} {activeChar.name} 好感度調整
                    </Label>
                    <span className="text-xs font-bold font-mono text-primary">
                      {activeChar.affection} / 100
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[activeChar.affection]}
                    onValueChange={([v]) => setAffection(activeCharacterId, v)}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60">
                    <span>0 陌生人</span>
                    <span>30 朋友</span>
                    <span>60 曖昧</span>
                    <span>100 攻略</span>
                  </div>
                </div>

                {/* System Prompt */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {activeChar.name} 的 System Prompt
                  </Label>
                  <Textarea
                    rows={8}
                    value={localPrompt}
                    onChange={(e) => setLocalPrompt(e.target.value)}
                    className="text-xs font-mono resize-none"
                  />
                  <Button size="sm" onClick={handleSavePrompt} className="w-full">
                    儲存 System Prompt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resetCharacter(activeCharacterId)}
                    className="w-full text-destructive hover:text-destructive"
                  >
                    重置角色（清除對話 & 好感度）
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
