import { useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Square, ImageIcon, X } from 'lucide-react'
import { resolveModel } from '@/lib/routing'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from 'sonner'
import type { ImageInputData } from '@/types'
import { cn } from '@/lib/utils'

interface InputBarProps {
  onSend: (text: string, imageData?: ImageInputData) => void
  onStop: () => void
  isStreaming: boolean
}

// Badge colour per model
const MODEL_BADGE: Record<string, string> = {
  'gemini-2.5-flash': 'bg-purple-100 text-purple-700 border-purple-300',
  'qwen35-397b':      'bg-orange-100 text-orange-700 border-orange-300',
  'qwen35-4b':        'bg-blue-100   text-blue-700   border-blue-300',
}

/** Resize image to max 800 px on the longer side, returns base64 + mimeType. */
async function resizeToBase64(
  file: File,
  maxDim = 800,
): Promise<{ base64: string; mimeType: string }> {
  if (file.type === 'image/gif') {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    return { base64: dataUrl.split(',')[1] ?? '', mimeType: file.type }
  }

  const img = new Image()
  const objectUrl = URL.createObjectURL(file)
  img.src = objectUrl
  await new Promise<void>((resolve) => { img.onload = () => resolve() })

  let { width, height } = img
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height * maxDim) / width)
      width = maxDim
    } else {
      width = Math.round((width * maxDim) / height)
      height = maxDim
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)
  URL.revokeObjectURL(objectUrl)

  const mimeType = file.type || 'image/jpeg'
  const dataUrl = canvas.toDataURL(mimeType)
  const base64 = dataUrl.split(',')[1]
  return { base64, mimeType }
}

export function InputBar({ onSend, onStop, isStreaming }: InputBarProps) {
  const [input, setInput] = useState('')
  const [imageData, setImageData] = useState<ImageInputData | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const settings = useSettingsStore((s) => s.settings)

  // Compute routing badge based on whether an image is attached
  const routingResult = resolveModel({
    hasImage: !!imageData,
    isSpecialEvent: false,
    usesTool: false,
    isMemorySummary: false,
    userSelectedModel: settings.model,
  })
  const badgeClass = MODEL_BADGE[routingResult.model] ?? 'bg-muted text-muted-foreground border-border'

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const handleSend = () => {
    const text = input.trim()
    if ((!text && !imageData) || isStreaming) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    const img = imageData
    setImageData(null)
    onSend(text, img ?? undefined)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-selected

    if (file.size > 4 * 1024 * 1024) {
      toast.error('圖片大小不可超過 4MB')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    try {
      const { base64, mimeType } = await resizeToBase64(file)
      setImageData({ base64, mimeType, previewUrl })
    } catch {
      URL.revokeObjectURL(previewUrl)
      toast.error('圖片處理失敗，請重試')
    }
  }

  const removeImage = () => {
    if (imageData) URL.revokeObjectURL(imageData.previewUrl)
    setImageData(null)
  }

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm p-3 space-y-2">
      {/* Image preview */}
      {imageData && (
        <div className="relative inline-block">
          <img
            src={imageData.previewUrl}
            alt="預覽圖片"
            className="max-h-24 rounded-lg border border-border object-cover"
          />
          <button
            onClick={removeImage}
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:opacity-80"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
        {/* Image upload button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="傳送圖片"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />

        <Textarea
          ref={textareaRef}
          rows={1}
          placeholder="說點什麼… (Enter 送出，Shift+Enter 換行)"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            autoResize()
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 min-h-[24px] max-h-[120px]"
        />

        {/* Model badge */}
        <span
          className={cn(
            'flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium leading-none self-center',
            badgeClass,
          )}
        >
          {routingResult.model}
        </span>

        {isStreaming ? (
          <Button variant="destructive" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onStop}>
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleSend}
            disabled={!input.trim() && !imageData}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
