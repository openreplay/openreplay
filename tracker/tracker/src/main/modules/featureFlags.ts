import App from '../app/index.js'

export interface IFeatureFlag {
  key: string
  is_persist: boolean
  value: string | boolean
  payload: string
}

export interface PersistFlagsData {
  key: string
  value: string | boolean
}

export default class FeatureFlags {
  flags: Record<string, any>
  storageKey = '__openreplay_flags'
  onFlagsCb: (flags: Record<string, any>) => void

  constructor(private readonly app: App) {
    const persistFlags = this.app.localStorage.getItem(this.storageKey)
    if (persistFlags) {
      const persistFlagsStrArr = persistFlags.split(';')
      const persistFlagsArr = persistFlagsStrArr.map((flag) => JSON.parse(flag))
      const flags: Record<string, any> = {}
      persistFlagsArr.forEach((flag) => {
        flags[flag.key] = {
          value: flag.value,
          payload: flag.payload,
        }
      })
      this.flags = flags
    }
  }

  isFlagEnabled(flagName: string): boolean {
    return Boolean(this.flags[flagName])
  }

  onFlagsLoad(cb: (flags: IFeatureFlag[]) => void) {
    return (this.onFlagsCb = cb)
  }

  async reloadFlags() {
    const sessionInfo = this.app.session.getInfo()
    const requestObject = {
      projectID: sessionInfo.projectID,
      userID: sessionInfo.userID,
      metadata: sessionInfo.metadata,
      referrer: document.referrer,
      featureFlags: this.flags,
      // todo: get from backend
      os: 'test',
      osVersion: 'test',
      device: 'test',
      country: 'test',
      state: 'test',
      city: 'test',
      ua: 'test',
      browser: 'test',
      browserVersion: 'test',
      deviceType: 'test',
      persistFlags: this.app.localStorage.getItem(this.storageKey) || [],
    }

    const resp = await fetch(this.app.options.ingestPoint + '/v1/web/feature-flags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.app.session.getSessionToken() as string}`,
      },
      body: JSON.stringify(requestObject),
    })
    if (resp.status === 200) {
      const data: { flags: IFeatureFlag[] } = await resp.json()
      return this.handleFlags(data.flags)
    }
  }

  handleFlags(flags: IFeatureFlag[]) {
    const persistFlags: PersistFlagsData[] = []
    Object.values(flags).forEach((flag) => {
      if (flag.is_persist) persistFlags.push({ key: flag.key, value: flag.value })
    })
    let str = ''
    const uniquePersistFlags = this.diffPersist(persistFlags)
    uniquePersistFlags.forEach((flag) => {
      str += `${JSON.stringify(flag)};`
    })

    this.app.localStorage.setItem(this.storageKey, str)
    this.flags = flags
    return this.onFlagsCb?.(flags)
  }

  clearPersistFlags() {
    this.app.localStorage.removeItem(this.storageKey)
  }

  diffPersist(flags: PersistFlagsData[]) {
    const persistFlags = this.app.localStorage.getItem(this.storageKey)
    if (!persistFlags) return flags
    const persistFlagsStrArr = persistFlags.split(';')
    const persistFlagsArr = persistFlagsStrArr.map((flag) => JSON.parse(flag))
    return flags.filter((flag) => persistFlagsArr.findIndex((pf) => pf.key === flag.key) === -1)
  }
}
