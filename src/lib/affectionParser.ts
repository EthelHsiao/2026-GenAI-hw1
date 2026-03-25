const DELTA_REGEX = /\[AFFECTION_DELTA:([+-]?\d+)\]/g

export function parseAffectionDelta(content: string): { clean: string; delta: number } {
  let delta = 0
  const match = content.match(/\[AFFECTION_DELTA:([+-]?\d+)\]/)
  if (match) {
    delta = parseInt(match[1], 10)
  }
  const clean = content.replace(DELTA_REGEX, '').trim()
  return { clean, delta }
}

/** Strip delta marker for display during streaming (hides partial markers too) */
export function getDisplayContent(raw: string): string {
  // Remove complete markers
  let result = raw.replace(DELTA_REGEX, '')
  // Hide partial marker being built up at the end
  const partialIdx = result.lastIndexOf('[AFFECTION_DELTA:')
  if (partialIdx !== -1) {
    result = result.slice(0, partialIdx)
  }
  return result.trim()
}
