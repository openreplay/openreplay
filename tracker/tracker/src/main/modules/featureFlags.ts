import App from '../app/index.js'

export default class FeatureFlags {
  flags: Record<string, any>
  storageKey = '__openreplay_flags'

  constructor(private readonly app: App) {}

  isFlagEnabled(flagName: string): boolean {
    return this.flags[flagName] && this.flags[flagName].enabled
  }

  onFlagsLoad(cb: (flags: Record<string, any>) => void) {
    return cb(this.flags)
  }

  reloadFlags() {
    const sessionInfo = this.app.session.getInfo()
    const requestObject = {
      projectID: sessionInfo.projectID,
      userID: sessionInfo.userID,
      metadata: sessionInfo.metadata,
      referrer: document.referrer,
      featureFlags: this.flags,
      // todo: get from backend
      os: '',
      osVersion: '',
      device: '',
      country: '',
      state: '',
      city: '',
      ua: '',
      browser: '',
      browserVersion: '',
      deviceType: '',
    }
    return this.flags
  }

  handleFlags(flags: Record<string, any>) {
    const persistFlags: string[] = []
    Object.values(flags).forEach((flag: Record<string, string>) => {
      if (flag.persist) persistFlags.push(flag.name)
    })
    this.app.localStorage.setItem(this.storageKey, this.diffPersist(persistFlags).join(','))
    this.flags = flags
  }

  clearPersistFlags() {
    this.app.localStorage.removeItem(this.storageKey)
  }

  diffPersist(flags: string[]) {
    const persistFlags = this.app.localStorage.getItem(this.storageKey)
    if (!persistFlags) return flags
    const persistFlagsArr = persistFlags.split(',')
    const uniqueFlags = flags.filter((flag) => !persistFlagsArr.includes(flag))
    return [...uniqueFlags, flags]
  }
}
