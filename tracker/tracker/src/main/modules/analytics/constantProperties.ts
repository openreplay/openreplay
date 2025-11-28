import { getUTCOffsetString, uaParse } from './utils.js'

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

const refKey = '$__or__initial_ref__$'
const distinctIdKey = '$__or__distinct_device_id__$'
const utmParamsKey = '$__or__utm_params__$'
const superPropKey = '$__or__super_properties__$'
const userIdKey = '$__or__user_id__$'

const win =
  'window' in globalThis
    ? window
    : ({
        navigator: { userAgent: '' },
        screen: {},
        document: {
          cookie: '',
        },
        location: { search: '' },
      } as unknown as Window & typeof globalThis)
const doc = 'document' in globalThis ? document : { referrer: ''}

const searchEngineList = [
  'google',
  'bing',
  'yahoo',
  'baidu',
  'yandex',
  'duckduckgo',
  'ecosia',
  'ask',
  'aol',
  'wolframalpha',
  'startpage',
  'swisscows',
  'qwant',
  'lycos',
  'dogpile',
  'info',
  'teoma',
  'webcrawler',
  'naver',
  'seznam',
  'perplexity',
]

export default class ConstantProperties {
  os: string
  osVersion: string
  browser: string
  browserVersion: string
  platform: string
  screenHeight: number
  screenWidth: number
  initialReferrer: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  deviceId: string
  searchEngine: string | null
  user_id: string | null = null

  constructor(
    private readonly localStorage: StorageLike,
    private readonly sessionStorage: StorageLike,
  ) {
    const { width, height, browser, browserVersion, browserMajorVersion, os, osVersion, mobile } =
      uaParse(win)
    const storedUserId = this.sessionStorage.getItem(userIdKey)
    if (storedUserId) {
      this.user_id = storedUserId
    }
    this.os = os
    this.osVersion = osVersion
    this.browser = `${browser}`
    this.browserVersion = `${browserVersion} (${browserMajorVersion})`
    this.platform = mobile ? 'mobile' : 'desktop'
    this.screenHeight = height
    this.screenWidth = width
    this.initialReferrer = this.getReferrer()
    this.deviceId = this.getDistinctDeviceId()
    this.searchEngine = this.getSearchEngine(this.initialReferrer)
    this.parseUTM()
  }

  public get all() {
    return {
      os: this.os,
      os_version: this.osVersion,
      browser: this.browser,
      browser_version: this.browserVersion,
      platform: this.platform,
      screen_height: this.screenHeight,
      screen_width: this.screenWidth,
      initial_referrer: this.initialReferrer,
      utm_source: this.utmSource,
      utm_medium: this.utmMedium,
      utm_campaign: this.utmCampaign,
      user_id: this.user_id,
      distinct_id: this.deviceId,
      sdk_edition: 'web',
      sdk_version: 'TRACKER_VERSION',
      timezone: getUTCOffsetString(),
      search_engine: this.searchEngine,
    }
  }

  setUserId = (user_id: string | null) => {
    this.user_id = user_id
    this.sessionStorage.setItem(userIdKey, user_id ?? '')
  }

  resetUserId = () => {
    this.user_id = null
    this.deviceId = this.getDistinctDeviceId(true)
  }

  public get defaultPropertyKeys() {
    return Object.keys(this.all)
  }

  public get distinctId() {
    return this.deviceId
  }

  private getDistinctDeviceId = (force?: boolean) => {
    const potentialStored = this.localStorage.getItem(distinctIdKey)
    if (potentialStored && !force) {
      return potentialStored
    } else {
      const distinctId = `${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
      this.localStorage.setItem(distinctIdKey, distinctId)
      return distinctId
    }
  }

  private getReferrer = () => {
    const potentialStored = this.sessionStorage.getItem(refKey)
    if (potentialStored) {
      return potentialStored
    } else {
      const ref = doc.referrer
      this.sessionStorage.setItem(refKey, ref)
      return ref
    }
  }

  private parseUTM = () => {
    const potentialStored = this.sessionStorage.getItem(utmParamsKey)
    if (potentialStored) {
      const obj = JSON.parse(potentialStored)
      this.utmSource = obj.utm_source
      this.utmMedium = obj.utm_medium
      this.utmCampaign = obj.utm_campaign
    } else {
      const searchParams = new URLSearchParams(win.location.search)
      this.utmSource = searchParams.get('utm_source') || null
      this.utmMedium = searchParams.get('utm_medium') || null
      this.utmCampaign = searchParams.get('utm_campaign') || null

      const obj = {
        utm_source: this.utmSource,
        utm_medium: this.utmMedium,
        utm_campaign: this.utmCampaign,
      }
      this.sessionStorage.setItem(utmParamsKey, JSON.stringify(obj))
    }
  }

  private getSearchEngine = (ref: string) => {
    for (const searchEngine of searchEngineList) {
      if (ref.includes(searchEngine)) {
        return searchEngine
      }
    }
    return null
  }

  getSuperProperties = (): Record<string, any> => {
    const potentialStored = this.localStorage.getItem(superPropKey)
    if (potentialStored) {
      return JSON.parse(potentialStored)
    } else {
      return {}
    }
  }

  saveSuperProperties = (props: Record<string, any>) => {
    this.localStorage.setItem(superPropKey, JSON.stringify(props))
  }

  clearSuperProperties = () => {
    this.localStorage.setItem(superPropKey, JSON.stringify({}))
  }
}
