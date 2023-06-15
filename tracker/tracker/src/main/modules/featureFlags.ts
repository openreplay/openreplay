import App from '../app/index.js'

export interface IFeatureFlag {
  key: string
  is_persist: boolean
  value: string | boolean
  payload: string
}

interface PersistFlagsData {
  key: string
  value: string | boolean
}

export default class FeatureFlags {
  flags: Record<string, any>
  storageKey = '__openreplay_flags'
  onFlagsCb: (flags: Record<string, any>) => void

  constructor(private readonly app: App) {}

  isFlagEnabled(flagName: string): boolean {
    return this.flags[flagName] && this.flags[flagName].enabled
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
      console.log(data)
      return this.handleFlags(data.flags)
    }
  }

  handleFlags(flags: IFeatureFlag[]) {
    const persistFlags: PersistFlagsData[] = []
    Object.values(flags).forEach((flag) => {
      if (flag.is_persist) persistFlags.push({ key: flag.key, value: flag.value })
    })
    this.app.localStorage.setItem(this.storageKey, this.diffPersist(persistFlags).join(','))
    this.flags = flags
    return this.onFlagsCb(flags)
  }

  clearPersistFlags() {
    this.app.localStorage.removeItem(this.storageKey)
  }

  diffPersist(flags: PersistFlagsData[]) {
    const persistFlags = this.app.localStorage.getItem(this.storageKey)
    if (!persistFlags) return flags
    const persistFlagsArr = persistFlags.split(',')
    const uniqueFlags = flags.filter(
      (flag) => persistFlagsArr.findIndex((pf) => pf.includes(flag.key)) === -1,
    )
    return [...uniqueFlags, flags]
  }
}
