/** Additional source-side filtering. Existing masking runs before this callback. */
export type CaptureData =
  | { kind: 'attribute'; name: string; value: string; node: Element | null }
  | {
      kind: 'resource'
      resourceType: 'image' | 'stylesheet' | 'svg' | 'timing' | 'base'
      value: string
      node: Element | null
    }
  | {
      kind: 'css'
      source: 'attribute' | 'text' | 'rule' | 'adopted'
      value: string
      node: Element | null
    }
  | { kind: 'font'; field: 'family' | 'source' | 'descriptors'; value: string; node: null }

/** Return a replacement string or null to omit the value after existing masking.
 * Must be synchronous; exceptions and non-string results omit the value.
 */
export type CaptureSanitizer = (data: Readonly<CaptureData>) => string | null

export function sanitizeCapture(
  callback: CaptureSanitizer | undefined,
  data: CaptureData,
): string | null {
  if (callback === undefined) return data.value
  try {
    const value: unknown = callback(Object.freeze(data))
    // Async callbacks are invalid, but their rejected data must not escape via unhandledrejection.
    if (value !== null && (typeof value === 'object' || typeof value === 'function'))
      void Promise.resolve(value).catch(() => {})
    return typeof value === 'string' ? value : null
  } catch {
    // Never log captured data or fall back to it after a policy failure.
    return null
  }
}

export const PLACEHOLDER_SRC = 'https://static.openreplay.com/tracker/placeholder.jpeg'

// Only explicit SDK call sites may request these exemptions; DOM names/values alone cannot.
export function isGeneratedAttribute(name: string, value: string): boolean {
  return (
    (name === 'src' && value === PLACEHOLDER_SRC) ||
    ((name === 'width' || name === 'height') && /^\d+(?:\.\d+)?$/.test(value)) ||
    (name === 'style' && /^width: \d+(?:\.\d+)?px; height: \d+(?:\.\d+)?px;$/.test(value)) ||
    (name === '__openreplay_dialog' && ['modal', 'nonmodal', 'closed'].includes(value)) ||
    (name === 'orloaded' && value === 'true') ||
    (name === '__openreplay_color_scheme' && ['dark', 'light', 'normal'].includes(value))
  )
}
