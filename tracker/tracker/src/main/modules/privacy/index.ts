/**
 * Standalone privacy / consent controller. Not wired into the tracker yet:
 * see PRIVACY_MODULE.md next to this file for the integration plan.
 * */
import {
  Consent,
  ConsentSource,
  Policy,
  PolicyOptions,
  Signals,
  defaultPolicyOptions,
  isPending,
  resolvePolicy,
  samePolicy,
} from './policy.js'
import { PolicyStorage, StorageKind, allows } from './storage.js'
import { readSignals, watchGoogleConsentMode } from './signals.js'

export type { Consent, ConsentValue, Policy, PolicyOptions, Signals } from './policy.js'
export { PolicyStorage } from './storage.js'

export interface PrivacyOptions extends Partial<PolicyOptions> {
  /** initial consent; missing categories are 'pending' */
  consent?: Partial<Consent>
  /** follow Google Consent Mode (analytics_storage) from window.dataLayer. @default false */
  googleConsentMode?: boolean | { dataLayerName?: string }
  /** keys the tracker writes; erased from the device when storage consent is withdrawn */
  storageKeys?: string[]
}

export interface PrivacyChange {
  prev: Policy
  next: Policy
  source: ConsentSource
  /** consent was withdrawn: the current session must end and ids must be dropped */
  revoked: boolean
}

type Env = { navigator?: Partial<Navigator>; window?: any; crypto?: Crypto }

const RECORD_RANK = { none: 0, private: 1, full: 2 } as const

export default class PrivacyManager {
  private readonly opts: PolicyOptions
  private consent: Consent
  private explicit = { recording: false, storage: false }
  private readonly signals: Signals
  private policy: Policy
  private lastSource: ConsentSource = 'default'
  private readonly listeners = new Set<(change: PrivacyChange) => void>()
  private readonly storages: PolicyStorage[] = []
  private readonly storageKeys: string[]
  private readonly waiters: Array<(p: Policy) => void> = []
  private stopGcm: (() => void) | null = null
  private readonly env: Env

  constructor(options: PrivacyOptions = {}, env?: Env) {
    this.env = env ?? {
      navigator: typeof navigator !== 'undefined' ? navigator : undefined,
      window: typeof window !== 'undefined' ? window : undefined,
      crypto: typeof crypto !== 'undefined' ? crypto : undefined,
    }
    const { consent, googleConsentMode, storageKeys, ...policyOpts } = options
    this.opts = { ...defaultPolicyOptions, ...policyOpts }
    this.consent = { recording: 'pending', storage: 'pending', ...consent }
    this.explicit = {
      recording: consent?.recording !== undefined && consent.recording !== 'pending',
      storage: consent?.storage !== undefined && consent.storage !== 'pending',
    }
    this.storageKeys = storageKeys ?? []
    this.signals = readSignals(this.env.navigator, this.env.window)
    this.policy = this.compute()
    if (this.signals.gpc && this.opts.respectGPC) this.lastSource = 'gpc'
    else if (this.signals.dnt && this.opts.respectDNT) this.lastSource = 'dnt'

    if (googleConsentMode) {
      const name = typeof googleConsentMode === 'object' ? googleConsentMode.dataLayerName : undefined
      this.stopGcm = watchGoogleConsentMode(
        this.env.window,
        (c) => this.setConsent(c, 'gcm'),
        name,
      )
    }
  }

  private compute(): Policy {
    return resolvePolicy({ consent: this.consent, signals: this.signals }, this.opts, this.explicit)
  }

  getPolicy(): Policy {
    return this.policy
  }

  getConsent(): Consent {
    return { ...this.consent }
  }

  getSignals(): Signals {
    return { ...this.signals }
  }

  /** True while optIn mode waits for the visitor's decision. */
  isPending(): boolean {
    return isPending({ consent: this.consent, signals: this.signals }, this.opts)
  }

  /** Resolves once a decision exists (immediately in optOut mode). */
  ready(): Promise<Policy> {
    if (!this.isPending()) return Promise.resolve(this.policy)
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  setConsent(consent: Partial<Consent>, source: ConsentSource = 'api'): Policy {
    const wasPending = this.isPending()
    const next = { ...this.consent, ...consent }
    if (consent.recording !== undefined) {
      this.explicit.recording = consent.recording !== 'pending'
    }
    if (consent.storage !== undefined) {
      this.explicit.storage = consent.storage !== 'pending'
    }
    this.consent = next
    this.lastSource = source
    const prev = this.policy
    this.policy = this.compute()

    const decided = wasPending && !this.isPending()
    if (decided && this.waiters.length) {
      this.waiters.splice(0).forEach((resolve) => resolve(this.policy))
    }
    if (samePolicy(prev, this.policy)) {
      // e.g. optIn pending -> denied: nothing changes, but legacy keys can go now
      if (decided) this.purgeDisallowed()
      return this.policy
    }

    this.storages.forEach((s) => s.applyPolicy(this.policy))
    const revoked =
      RECORD_RANK[this.policy.record] < RECORD_RANK[prev.record] ||
      (prev.storage !== 'none' && this.policy.storage === 'none')
    if (revoked || decided) this.purgeDisallowed()
    const change: PrivacyChange = { prev, next: this.policy, source, revoked }
    this.listeners.forEach((cb) => {
      try {
        cb(change)
      } catch {
        // a listener must not break consent handling
      }
    })
    return this.policy
  }

  private purgeDisallowed(storages = this.storages) {
    storages.forEach((s) => {
      if (!allows(this.policy, s.kind)) s.purge(this.storageKeys)
    })
  }

  onChange(cb: (change: PrivacyChange) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** Storage the tracker should use instead of window.localStorage/sessionStorage. */
  createStorage(kind: StorageKind, real?: Storage | null): Storage {
    let target: Storage | null = real ?? null
    if (real === undefined) {
      try {
        target = kind === 'local' ? this.env.window?.localStorage : this.env.window?.sessionStorage
      } catch {
        target = null
      }
    }
    const storage = new PolicyStorage(kind, target ?? null, this.policy)
    this.storages.push(storage)
    // while optIn is pending a returning visitor's consent may still arrive, so keep keys until then
    if (!this.isPending()) this.purgeDisallowed([storage])
    return storage
  }

  /** User id as the policy allows it: null (drop), SHA-256 hex, or as is. */
  async transformUserId(id: string): Promise<string | null> {
    if (!id) return null
    switch (this.policy.identity) {
      case 'none':
        return null
      case 'raw':
        return id
      case 'hashed':
        return this.sha256(id)
    }
  }

  private async sha256(value: string): Promise<string | null> {
    const subtle = this.env.crypto?.subtle
    // no WebCrypto (insecure context): dropping is the only safe option
    if (!subtle) return null
    const data = new TextEncoder().encode(value)
    const digest = await subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /** Short summary for session metadata / debugging. */
  describe() {
    return {
      policy: this.policy,
      consent: this.getConsent(),
      signals: this.getSignals(),
      source: this.lastSource,
    }
  }

  destroy() {
    this.stopGcm?.()
    this.stopGcm = null
    this.listeners.clear()
    this.waiters.length = 0
  }
}
