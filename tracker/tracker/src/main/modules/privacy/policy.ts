export type ConsentValue = 'granted' | 'denied' | 'pending'

/**
 * What the visitor agreed to. Mirrors Google Consent Mode categories we actually need:
 * - recording: session replay and events (analytics_storage in GCM terms)
 * - storage: persisting ids on the device (localStorage/sessionStorage/cookies)
 * */
export interface Consent {
  recording: ConsentValue
  storage: ConsentValue
}

export type ConsentSource = 'default' | 'api' | 'gpc' | 'dnt' | 'gcm'

/** Browser-level signals; true means the visitor opted out. */
export interface Signals {
  gpc: boolean
  dnt: boolean
}

/** What the tracker is allowed to do right now. Integration code only reads this. */
export interface Policy {
  /** none: don't record; private: record with everything masked; full: normal recording */
  record: 'none' | 'private' | 'full'
  /** none: in-memory only (cookieless); session: sessionStorage only; persistent: all storage */
  storage: 'none' | 'session' | 'persistent'
  /** none: never send user id / metadata; hashed: SHA-256 of user id; raw: as provided */
  identity: 'none' | 'hashed' | 'raw'
  /** network request/response bodies and headers */
  networkPayloads: boolean
}

export interface PolicyInput {
  consent: Consent
  signals: Signals
}

export interface PolicyOptions {
  /**
   * optOut (default): record unless the visitor declined.
   * optIn: nothing is recorded or stored until consent is granted.
   * */
  mode: 'optOut' | 'optIn'
  /** treat navigator.globalPrivacyControl as an opt-out. @default true */
  respectGPC: boolean
  /** treat Do Not Track as an opt-out. @default false */
  respectDNT: boolean
  /** explicit consent from the page (setConsent) can override GPC/DNT. @default false */
  consentOverridesSignals: boolean
  /** how to record when recording consent is denied. @default 'none' */
  deniedRecording: 'none' | 'private'
  /** always hash the user id, even with full consent. @default false */
  hashUserId: boolean
  /** final say: adjust the computed policy (custom laws, regions, cookies...) */
  resolvePolicy?: (policy: Policy, input: PolicyInput) => Policy
}

export const defaultPolicyOptions: PolicyOptions = {
  mode: 'optOut',
  respectGPC: true,
  respectDNT: false,
  consentOverridesSignals: false,
  deniedRecording: 'none',
  hashUserId: false,
}

function effective(
  value: ConsentValue,
  optedOutBySignal: boolean,
  explicit: boolean,
  opts: PolicyOptions,
): ConsentValue {
  if (optedOutBySignal && !(explicit && opts.consentOverridesSignals)) {
    return 'denied'
  }
  if (value === 'pending') {
    return opts.mode === 'optIn' ? 'pending' : 'granted'
  }
  return value
}

/** Pure mapping from consent + signals to a policy. */
export function resolvePolicy(
  input: PolicyInput,
  opts: PolicyOptions,
  explicit: { recording: boolean; storage: boolean } = { recording: false, storage: false },
): Policy {
  const optedOut = (opts.respectGPC && input.signals.gpc) || (opts.respectDNT && input.signals.dnt)
  const recording = effective(input.consent.recording, optedOut, explicit.recording, opts)
  const storage = effective(input.consent.storage, optedOut, explicit.storage, opts)

  let policy: Policy
  if (recording === 'granted') {
    policy = {
      record: 'full',
      storage: storage === 'granted' ? 'persistent' : 'none',
      identity: opts.hashUserId || storage !== 'granted' ? 'hashed' : 'raw',
      networkPayloads: true,
    }
  } else if (recording === 'denied' && opts.deniedRecording === 'private') {
    policy = { record: 'private', storage: 'none', identity: 'none', networkPayloads: false }
  } else {
    // denied, or pending in optIn mode
    policy = { record: 'none', storage: 'none', identity: 'none', networkPayloads: false }
  }

  return opts.resolvePolicy ? opts.resolvePolicy(policy, input) : policy
}

export function isPending(input: PolicyInput, opts: PolicyOptions): boolean {
  return opts.mode === 'optIn' && input.consent.recording === 'pending'
}

export function samePolicy(a: Policy, b: Policy): boolean {
  return (
    a.record === b.record &&
    a.storage === b.storage &&
    a.identity === b.identity &&
    a.networkPayloads === b.networkPayloads
  )
}
