import { getUTCOffsetString, uaParse } from './utils.js'

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

const refKey = '$__or__initial_ref__$'
const distinctIdKey = '$__or__distinct_device_id__$'
const utmParamsKey = '$__or__utm_params__$'
const prefix = '$'

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

export default class SharedProperties {
  os: string
  osVersion: string
  browser: string
  browserVersion: string
  device: string
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
      uaParse(window)
    this.os = os
    this.osVersion = osVersion
    this.browser = `${browser}`
    this.browserVersion = `${browserVersion} (${browserMajorVersion})`
    this.device = mobile ? 'Mobile' : 'Desktop'
    this.screenHeight = height
    this.screenWidth = width
    this.initialReferrer = this.getReferrer()
    this.deviceId = this.getDistinctDeviceId()
    this.searchEngine = this.getSearchEngine(this.initialReferrer)
    this.parseUTM()
  }

  public get all() {
    return {
      [`${prefix}os`]: this.os,
      [`${prefix}os_version`]: this.osVersion,
      [`${prefix}browser`]: this.browser,
      [`${prefix}browser_version`]: this.browserVersion,
      [`${prefix}device`]: this.device,
      [`${prefix}screen_height`]: this.screenHeight,
      [`${prefix}screen_width`]: this.screenWidth,
      [`${prefix}initial_referrer`]: this.initialReferrer,
      [`${prefix}utm_source`]: this.utmSource,
      [`${prefix}utm_medium`]: this.utmMedium,
      [`${prefix}utm_campaign`]: this.utmCampaign,
      [`${prefix}device_id`]: this.deviceId,
      [`${prefix}user_id`]: this.user_id,
      [`${prefix}distinct_id`]: this.user_id ?? this.deviceId,
      [`${prefix}sdk_edition`]: 'web',
      [`${prefix}sdk_version`]: 'TRACKER_VERSION',
      [`${prefix}timezone`]: getUTCOffsetString(),
      [`${prefix}search_engine`]: this.searchEngine,
    }
  }

  setUserId = (user_id: string | null) => {
    this.user_id = user_id
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
      const ref = document.referrer
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
      const searchParams = new URLSearchParams(window.location.search)
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
}
