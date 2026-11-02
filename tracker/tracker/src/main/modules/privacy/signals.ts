import type { Consent, ConsentValue, Signals } from './policy.js'

export function readSignals(nav: Partial<Navigator> | undefined, win?: any): Signals {
  const n = nav as any
  return {
    gpc: Boolean(n?.globalPrivacyControl),
    dnt: n?.doNotTrack === '1' || n?.doNotTrack === 'yes' || win?.doNotTrack === '1',
  }
}

type GcmValue = 'granted' | 'denied'
type GcmState = Partial<Record<'analytics_storage' | 'ad_storage', GcmValue>>

function fromGcm(state: GcmState): Partial<Consent> {
  const v = state.analytics_storage
  if (v !== 'granted' && v !== 'denied') return {}
  const value: ConsentValue = v
  return { recording: value, storage: value }
}

// gtag() pushes `arguments` objects: ['consent', 'default' | 'update', {...}]
function asConsentCommand(entry: unknown): GcmState | null {
  if (!entry || typeof entry !== 'object' || typeof (entry as any).length !== 'number') return null
  const e = entry as ArrayLike<unknown>
  if (e[0] !== 'consent' || (e[1] !== 'default' && e[1] !== 'update')) return null
  const state = e[2] as (GcmState & { region?: unknown }) | undefined
  if (!state || typeof state !== 'object') return null
  // we don't know the visitor's region, so region-scoped defaults can't be applied
  if (e[1] === 'default' && state.region !== undefined) return null
  return state
}

/**
 * Follows Google Consent Mode through window.dataLayer: replays entries already pushed
 * and wraps dataLayer.push for later updates (keeping any existing wrapper intact).
 * Returns a function that restores the previous push.
 * */
export function watchGoogleConsentMode(
  win: any,
  onConsent: (consent: Partial<Consent>) => void,
  dataLayerName = 'dataLayer',
): () => void {
  if (!win) return () => {}
  const dl: unknown[] = (win[dataLayerName] = win[dataLayerName] || [])
  let active = true
  const handle = (entry: unknown) => {
    if (!active) return
    const state = asConsentCommand(entry)
    if (state) {
      const consent = fromGcm(state)
      if (consent.recording) onConsent(consent)
    }
  }
  dl.forEach(handle)

  const prevPush = dl.push
  const wrapped = function (this: unknown, ...items: unknown[]) {
    const result = prevPush.apply(dl, items)
    items.forEach(handle)
    return result
  }
  dl.push = wrapped
  return () => {
    active = false
    // a wrapper installed after ours still calls into it, so only unhook when we're on top
    if (dl.push === wrapped) dl.push = prevPush
  }
}
