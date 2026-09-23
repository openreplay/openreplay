import { describe, expect, test, jest } from '@jest/globals'
import PrivacyManager from '../main/modules/privacy/index.js'
import { resolvePolicy, defaultPolicyOptions } from '../main/modules/privacy/policy.js'
import { watchGoogleConsentMode } from '../main/modules/privacy/signals.js'
import { PolicyStorage } from '../main/modules/privacy/storage.js'
import { createHash, webcrypto } from 'crypto'
import { TextEncoder as NodeTextEncoder } from 'util'

// jsdom has no TextEncoder
if (typeof globalThis.TextEncoder === 'undefined') {
  ;(globalThis as any).TextEncoder = NodeTextEncoder
}

class FakeStorage implements Storage {
  data = new Map<string, string>()
  get length() {
    return this.data.size
  }
  clear() {
    this.data.clear()
  }
  getItem(k: string) {
    return this.data.get(k) ?? null
  }
  key(i: number) {
    return Array.from(this.data.keys())[i] ?? null
  }
  removeItem(k: string) {
    this.data.delete(k)
  }
  setItem(k: string, v: string) {
    this.data.set(k, v)
  }
}

const env = (nav: Record<string, unknown> = {}, win: Record<string, unknown> = {}) => ({
  navigator: nav as Partial<Navigator>,
  window: win,
  crypto: webcrypto as unknown as Crypto,
})

describe('resolvePolicy', () => {
  const signals = { gpc: false, dnt: false }

  test('optOut records fully while consent is pending', () => {
    const p = resolvePolicy(
      { consent: { recording: 'pending', storage: 'pending' }, signals },
      defaultPolicyOptions,
    )
    expect(p).toEqual({ record: 'full', storage: 'persistent', identity: 'raw', networkPayloads: true })
  })

  test('optIn records nothing while pending', () => {
    const p = resolvePolicy(
      { consent: { recording: 'pending', storage: 'pending' }, signals },
      { ...defaultPolicyOptions, mode: 'optIn' },
    )
    expect(p).toEqual({ record: 'none', storage: 'none', identity: 'none', networkPayloads: false })
  })

  test('recording without storage is cookieless with hashed identity', () => {
    const p = resolvePolicy(
      { consent: { recording: 'granted', storage: 'denied' }, signals },
      defaultPolicyOptions,
    )
    expect(p).toEqual({ record: 'full', storage: 'none', identity: 'hashed', networkPayloads: true })
  })

  test('GPC opts out and wins over page consent by default', () => {
    const input = { consent: { recording: 'granted', storage: 'granted' } as const, signals: { gpc: true, dnt: false } }
    const explicit = { recording: true, storage: true }
    expect(resolvePolicy(input, defaultPolicyOptions, explicit).record).toBe('none')
    expect(
      resolvePolicy(input, { ...defaultPolicyOptions, consentOverridesSignals: true }, explicit).record,
    ).toBe('full')
  })

  test('consentOverridesSignals needs explicit consent', () => {
    const input = { consent: { recording: 'granted', storage: 'granted' } as const, signals: { gpc: true, dnt: false } }
    const opts = { ...defaultPolicyOptions, consentOverridesSignals: true }
    expect(resolvePolicy(input, opts).record).toBe('none')
    expect(resolvePolicy(input, opts, { recording: true, storage: false })).toEqual({
      record: 'full',
      storage: 'none',
      identity: 'hashed',
      networkPayloads: true,
    })
  })

  test('DNT is ignored unless respected', () => {
    const input = { consent: { recording: 'pending', storage: 'pending' } as const, signals: { gpc: false, dnt: true } }
    expect(resolvePolicy(input, defaultPolicyOptions).record).toBe('full')
    expect(resolvePolicy(input, { ...defaultPolicyOptions, respectDNT: true }).record).toBe('none')
  })

  test('denied recording can fall back to private mode', () => {
    const p = resolvePolicy(
      { consent: { recording: 'denied', storage: 'denied' }, signals },
      { ...defaultPolicyOptions, deniedRecording: 'private' },
    )
    expect(p).toEqual({ record: 'private', storage: 'none', identity: 'none', networkPayloads: false })
  })

  test('resolvePolicy hook has the final say', () => {
    const hook = jest.fn((pol: any, _input: any) => ({ ...pol, networkPayloads: false }))
    const input = { consent: { recording: 'pending', storage: 'pending' } as const, signals }
    const p = resolvePolicy(input, { ...defaultPolicyOptions, resolvePolicy: hook })
    expect(p.networkPayloads).toBe(false)
    expect(hook).toHaveBeenCalledWith(
      { record: 'full', storage: 'persistent', identity: 'raw', networkPayloads: true },
      input,
    )
  })
})

describe('PrivacyManager', () => {
  test('ready() waits for consent in optIn mode', async () => {
    const pm = new PrivacyManager({ mode: 'optIn' }, env())
    expect(pm.isPending()).toBe(true)
    let resolved = false
    const ready = pm.ready().then((p) => {
      resolved = true
      return p
    })
    await Promise.resolve()
    expect(resolved).toBe(false)
    pm.setConsent({ recording: 'granted', storage: 'granted' })
    expect((await ready).record).toBe('full')
  })

  test('onChange reports revocation and a throwing listener does not stop others', () => {
    const pm = new PrivacyManager({}, env())
    const bad = jest.fn(() => {
      throw new Error('boom')
    })
    const cb = jest.fn()
    pm.onChange(bad)
    pm.onChange(cb)
    pm.setConsent({ recording: 'denied' })
    expect(bad).toHaveBeenCalled()
    expect(cb).toHaveBeenCalledWith({
      prev: { record: 'full', storage: 'persistent', identity: 'raw', networkPayloads: true },
      next: { record: 'none', storage: 'none', identity: 'none', networkPayloads: false },
      source: 'api',
      revoked: true,
    })
  })

  test('consent back to pending drops the explicit override', () => {
    const pm = new PrivacyManager({ consentOverridesSignals: true }, env({ globalPrivacyControl: true }))
    pm.setConsent({ recording: 'granted', storage: 'granted' })
    expect(pm.getPolicy().record).toBe('full')

    pm.setConsent({ recording: 'pending', storage: 'pending' })
    expect(pm.getPolicy().record).toBe('none')
  })

  test('no change event when the policy stays the same', () => {
    const pm = new PrivacyManager({}, env())
    const cb = jest.fn()
    pm.onChange(cb)
    pm.setConsent({ recording: 'granted', storage: 'granted' })
    expect(cb).not.toHaveBeenCalled()
  })

  test('storage stays in memory until consent, then moves to the device', () => {
    const real = new FakeStorage()
    const pm = new PrivacyManager({ mode: 'optIn' }, env())
    const s = pm.createStorage('local', real)
    s.setItem('__openreplay_uuid', 'u1')
    expect(real.getItem('__openreplay_uuid')).toBe(null)
    expect(s.getItem('__openreplay_uuid')).toBe('u1')

    pm.setConsent({ recording: 'granted', storage: 'granted' })
    expect(real.getItem('__openreplay_uuid')).toBe('u1')

    // memory copy is gone: reads now come from the device only
    real.removeItem('__openreplay_uuid')
    expect(s.getItem('__openreplay_uuid')).toBe(null)
  })

  test('listed keys are purged when storage is created without storage consent', () => {
    const keys = ['__openreplay_uuid']
    const denied = new FakeStorage()
    denied.setItem('__openreplay_uuid', 'old')
    denied.setItem('page_key', 'keep')
    new PrivacyManager({ storageKeys: keys, consent: { storage: 'denied' } }, env()).createStorage('local', denied)
    expect(denied.getItem('__openreplay_uuid')).toBe(null)
    expect(denied.getItem('page_key')).toBe('keep')

    const gpc = new FakeStorage()
    gpc.setItem('__openreplay_uuid', 'old')
    new PrivacyManager({ storageKeys: keys }, env({ globalPrivacyControl: true })).createStorage('session', gpc)
    expect(gpc.getItem('__openreplay_uuid')).toBe(null)

    const granted = new FakeStorage()
    granted.setItem('__openreplay_uuid', 'old')
    new PrivacyManager({ storageKeys: keys }, env()).createStorage('local', granted)
    expect(granted.getItem('__openreplay_uuid')).toBe('old')
  })

  test('optIn keeps listed keys while pending and purges them once denied', () => {
    const real = new FakeStorage()
    real.setItem('__openreplay_uuid', 'old')
    const pm = new PrivacyManager({ mode: 'optIn', storageKeys: ['__openreplay_uuid'] }, env())
    pm.createStorage('local', real)
    expect(real.getItem('__openreplay_uuid')).toBe('old')

    pm.setConsent({ recording: 'denied', storage: 'denied' })
    expect(real.getItem('__openreplay_uuid')).toBe(null)
  })

  test('storage falls back to memory when the real storage throws', () => {
    const broken = new FakeStorage()
    broken.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    broken.getItem = () => {
      throw new Error('SecurityError')
    }
    const s = new PolicyStorage(
      'local',
      broken,
      { record: 'full', storage: 'persistent', identity: 'raw', networkPayloads: true },
    )
    s.setItem('k', 'v')
    expect(s.getItem('k')).toBe('v')
    expect(() => s.removeItem('k')).not.toThrow()
  })

  test('withdrawn storage consent erases own keys and listed keys only', () => {
    const real = new FakeStorage()
    real.setItem('page_key', 'keep')
    real.setItem('__openreplay_old', 'stale')
    const pm = new PrivacyManager({ storageKeys: ['__openreplay_old'] }, env())
    const s = pm.createStorage('local', real)
    s.setItem('__openreplay_uuid', 'u1')
    expect(real.getItem('__openreplay_uuid')).toBe('u1')

    pm.setConsent({ storage: 'denied' })
    expect(real.getItem('__openreplay_uuid')).toBe(null)
    expect(real.getItem('__openreplay_old')).toBe(null)
    expect(real.getItem('page_key')).toBe('keep')
    // still readable for the rest of this page, from memory
    expect(s.getItem('__openreplay_uuid')).toBe('u1')
  })

  test('own keys that are also listed stay readable in memory after revocation', () => {
    const real = new FakeStorage()
    const pm = new PrivacyManager({ storageKeys: ['__openreplay_uuid'] }, env())
    const s = pm.createStorage('local', real)
    s.setItem('__openreplay_uuid', 'u1')

    pm.setConsent({ storage: 'denied' })
    expect(real.getItem('__openreplay_uuid')).toBe(null)
    expect(s.getItem('__openreplay_uuid')).toBe('u1')
  })

  test('user id is hashed without storage consent and dropped without recording consent', async () => {
    const pm = new PrivacyManager({ consent: { storage: 'denied' } }, env())
    expect(await pm.transformUserId('john@example.com')).toBe(
      createHash('sha256').update('john@example.com').digest('hex'),
    )

    pm.setConsent({ recording: 'denied' })
    expect(await pm.transformUserId('john@example.com')).toBe(null)
  })

  test('user id is dropped when hashing is needed but WebCrypto is missing', async () => {
    const pm = new PrivacyManager({ consent: { storage: 'denied' } }, { ...env(), crypto: undefined })
    expect(pm.getPolicy().identity).toBe('hashed')
    expect(await pm.transformUserId('john@example.com')).toBe(null)
  })

  test('GPC is reported as the source', () => {
    const pm = new PrivacyManager({}, env({ globalPrivacyControl: true }))
    expect(pm.getPolicy().record).toBe('none')
    expect(pm.describe().source).toBe('gpc')
  })
})

describe('Google Consent Mode', () => {
  test('reads existing entries and follows updates without breaking push', () => {
    const win: any = { dataLayer: [] }
    // gtag pushes `arguments` objects
    const gtag = function (..._args: unknown[]) {
      // eslint-disable-next-line prefer-rest-params
      win.dataLayer.push(arguments)
    }
    gtag('consent', 'default', { analytics_storage: 'denied' })

    const pm = new PrivacyManager({ googleConsentMode: true }, env({}, win))
    expect(pm.getPolicy().record).toBe('none')

    gtag('consent', 'update', { analytics_storage: 'granted' })
    expect(pm.getPolicy().record).toBe('full')
    expect(win.dataLayer.length).toBe(2)
    pm.destroy()
  })

  test('restores the previous push on stop', () => {
    const win: any = { dataLayer: [] }
    const original = win.dataLayer.push
    const stop = watchGoogleConsentMode(win, () => {})
    expect(win.dataLayer.push).not.toBe(original)
    stop()
    expect(win.dataLayer.push).toBe(original)
  })

  test('a wrapper installed after ours is left alone on stop and updates stop after destroy', () => {
    const win: any = { dataLayer: [] }
    const pm = new PrivacyManager({ googleConsentMode: true }, env({}, win))
    const ours = win.dataLayer.push
    const later = function (this: unknown, ...items: unknown[]) {
      return ours.apply(win.dataLayer, items)
    }
    win.dataLayer.push = later

    pm.destroy()
    expect(win.dataLayer.push).toBe(later)

    win.dataLayer.push(['consent', 'update', { analytics_storage: 'denied' }])
    expect(pm.getPolicy().record).toBe('full')
    expect(win.dataLayer.length).toBe(1)
  })

  test('region-scoped defaults are ignored', () => {
    const win: any = {
      dataLayer: [['consent', 'default', { analytics_storage: 'denied', region: ['US-CA'] }]],
    }
    const pm = new PrivacyManager({ googleConsentMode: true }, env({}, win))
    expect(pm.getPolicy().record).toBe('full')

    win.dataLayer.push(['consent', 'default', { analytics_storage: 'denied' }])
    expect(pm.getPolicy().record).toBe('none')
    pm.destroy()
  })
})
