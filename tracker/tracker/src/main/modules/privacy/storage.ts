import type { Policy } from './policy.js'

export type StorageKind = 'local' | 'session'

class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length() {
    return this.data.size
  }
  clear() {
    this.data.clear()
  }
  getItem(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value))
  }
  entries() {
    return Array.from(this.data.entries())
  }
}

export function allows(policy: Policy, kind: StorageKind) {
  return policy.storage === 'persistent' || (policy.storage === 'session' && kind === 'session')
}

/**
 * Drop-in Storage that writes to the real storage only when the policy allows it,
 * otherwise keeps values in memory (cookieless mode). Only touches keys it wrote itself,
 * so page data in the same storage is never affected.
 * */
export class PolicyStorage implements Storage {
  private readonly memory = new MemoryStorage()
  private readonly ownKeys = new Set<string>()
  private allowed: boolean

  constructor(
    readonly kind: StorageKind,
    private readonly real: Storage | null,
    policy: Policy,
  ) {
    this.allowed = Boolean(real) && allows(policy, kind)
  }

  private get target(): Storage {
    return this.allowed && this.real ? this.real : this.memory
  }

  get length() {
    return this.target.length
  }
  clear() {
    this.ownKeys.forEach((k) => this.removeItem(k))
  }
  getItem(key: string) {
    try {
      return this.target.getItem(key)
    } catch {
      return this.memory.getItem(key)
    }
  }
  key(index: number) {
    return this.target.key(index)
  }
  removeItem(key: string) {
    this.ownKeys.delete(key)
    this.memory.removeItem(key)
    try {
      this.real?.removeItem(key)
    } catch {
      // storage can throw in private windows / sandboxed iframes
    }
  }
  setItem(key: string, value: string) {
    this.ownKeys.add(key)
    try {
      this.target.setItem(key, value)
    } catch {
      this.memory.setItem(key, value)
    }
  }

  /**
   * Upgrade: move in-memory values to the real storage.
   * Downgrade: move own keys from the real storage into memory and erase them from the device.
   * */
  applyPolicy(policy: Policy) {
    const nextAllowed = Boolean(this.real) && allows(policy, this.kind)
    if (nextAllowed === this.allowed || !this.real) {
      this.allowed = nextAllowed
      return
    }
    try {
      if (nextAllowed) {
        this.memory.entries().forEach(([k, v]) => this.real!.setItem(k, v))
        this.memory.clear()
      } else {
        this.ownKeys.forEach((k) => {
          const v = this.real!.getItem(k)
          if (v !== null) this.memory.setItem(k, v)
          this.real!.removeItem(k)
        })
      }
    } catch {
      // keep going with whatever got moved
    }
    this.allowed = nextAllowed
  }

  /**
   * Erase given keys (e.g. ones written by an older tracker version) from the real storage.
   * Memory copies are kept: revocation clears the device, the page keeps what it already holds.
   * */
  purge(keys: string[]) {
    if (!this.real) return
    keys.forEach((k) => {
      try {
        this.real?.removeItem(k)
      } catch {
        // ignore
      }
    })
  }
}
