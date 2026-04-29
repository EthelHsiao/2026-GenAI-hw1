/**
 * Speaks text using the browser's Web Speech API.
 * Cancels any currently playing utterance first.
 * @param onEnd  Optional callback fired when the utterance finishes.
 */
export function speak(text: string, lang = 'zh-TW', onEnd?: () => void): void {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.9
  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  window.speechSynthesis.cancel()
}
