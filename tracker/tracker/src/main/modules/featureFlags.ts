import App from '../app/index.js'

export interface IFeatureFlag {
  key: string
  is_persist: boolean
  value: string | boolean
  payload: string
}

export interface FetchPersistFlagsData {
  key: string
  value: string | boolean
}

export default class FeatureFlags {
  flags: IFeatureFlag[] = []
  storageKey = '__openreplay_flags'
  onFlagsCb: (flags: IFeatureFlag[]) => void

  constructor(private readonly app: App) {
    const persistFlags = this.app.sessionStorage.getItem(this.storageKey)
    if (persistFlags) {
      const persistFlagsStrArr = persistFlags.split(';').filter(Boolean)
      this.flags = persistFlagsStrArr.map((flag) => JSON.parse(flag))
    }
  }

  getFeatureFlag(flagName: string): IFeatureFlag | undefined {
    return this.flags.find((flag) => flag.key === flagName)
  }

  isFlagEnabled(flagName: string): boolean {
    return this.flags.findIndex((flag) => flag.key === flagName) !== -1
  }

  onFlagsLoad(cb: (flags: IFeatureFlag[]) => void) {
    this.onFlagsCb = cb
  }

  async reloadFlags(token?: string) {
    const persistFlagsStr = this.app.sessionStorage.getItem(this.storageKey)
    const persistFlags: Record<string, FetchPersistFlagsData> = {}
    if (persistFlagsStr) {
      const persistArray = persistFlagsStr.split(';').filter(Boolean)
      persistArray.forEach((flag) => {
        const flagObj = JSON.parse(flag)
        persistFlags[flagObj.key] = { key: flagObj.key, value: flagObj.value }
      })
    }
    const sessionInfo = this.app.session.getInfo()
    const userInfo = this.app.session.userInfo
    const requestObject = {
      projectID: sessionInfo.projectID,
      userID: sessionInfo.userID,
      metadata: sessionInfo.metadata,
      referrer: document.referrer,
      os: userInfo.userOS,
      device: userInfo.userDevice,
      country: userInfo.userCountry,
      state: userInfo.userState,
      city: userInfo.userCity,
      browser: userInfo.userBrowser,
      persistFlags: persistFlags,
    }

    const authToken = token ?? (this.app.session.getSessionToken() as string)
    const resp = await fetch(this.app.options.ingestPoint + '/v1/web/feature-flags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestObject),
    })
    if (resp.status === 200) {
      const data: { flags: IFeatureFlag[] } = await resp.json()
      return this.handleFlags(data.flags)
    }
  }

  handleFlags(flags: IFeatureFlag[]) {
    const persistFlags: IFeatureFlag[] = []
    flags.forEach((flag) => {
      if (flag.is_persist) persistFlags.push(flag)
    })

    let str = ''
    const uniquePersistFlags = this.diffPersist(persistFlags)
    uniquePersistFlags.forEach((flag) => {
      str += `${JSON.stringify(flag)};`
    })

    this.app.sessionStorage.setItem(this.storageKey, str)
    this.flags = flags
    return this.onFlagsCb?.(flags)
  }

  clearPersistFlags() {
    this.app.sessionStorage.removeItem(this.storageKey)
  }

  diffPersist(flags: IFeatureFlag[]) {
    const persistFlags = this.app.sessionStorage.getItem(this.storageKey)
    if (!persistFlags) return flags
    const persistFlagsStrArr = persistFlags.split(';').filter(Boolean)
    const persistFlagsArr = persistFlagsStrArr.map((flag) => JSON.parse(flag))

    return flags.filter((flag) => persistFlagsArr.findIndex((pf) => pf.key === flag.key) === -1)
  }
}
