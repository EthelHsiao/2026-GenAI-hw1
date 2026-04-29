export interface GeminiMessage {
  role: 'user' | 'model'
  content: string
}

/**
 * Calls Google Gemini 2.5 Flash for multimodal (image + text) input.
 * Returns the full text response (non-streaming).
 */
export async function callGeminiApi(options: {
  apiKey: string
  systemPrompt: string
  messages: GeminiMessage[]  // conversation history (text only)
  userText: string
  imageBase64: string        // base64, no data: prefix
  imageMimeType: string      // 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
}): Promise<string> {
  const { apiKey, systemPrompt, messages, userText, imageBase64, imageMimeType } = options

  const historyContents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...historyContents,
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
              { text: userText || '你覺得這張圖如何？' },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.9 },
      }),
    },
  )

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg =
      (body as { error?: { message?: string } })?.error?.message ??
      `Gemini HTTP ${response.status}: ${response.statusText}`
    throw new Error(msg)
  }

  const data = await response.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}
