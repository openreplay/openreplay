import App from '../index.js'
import { uaParse } from './utils.js'

const refKey = '$__initial_ref__$'
const distinctIdKey = '$__distinct_device_id__$'

export default class SharedProperties {
  os: string
  browser: string
  device: string
  screenHeight: number
  screenWidth: number
  initialReferrer: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  deviceId: string

  constructor(private readonly app: App) {
    const { width, height, browser, browserVersion, browserMajorVersion, os, osVersion, mobile } =
      uaParse(window)
    this.os = `${os} ${osVersion}`
    this.browser = `${browser} ${browserVersion} (${browserMajorVersion})`
    this.device = mobile ? 'Mobile' : 'Desktop'
    this.screenHeight = height
    this.screenWidth = width
    this.initialReferrer = this.getReferrer()
    const searchParams = new URLSearchParams(window.location.search)
    this.utmSource = searchParams.get('utm_source') || null
    this.utmMedium = searchParams.get('utm_medium') || null
    this.utmCampaign = searchParams.get('utm_campaign') || null
    this.deviceId = this.getDistinctDeviceId()
  }

  get all() {
    return {
      os: this.os,
      browser: this.browser,
      device: this.device,
      screenHeight: this.screenHeight,
      screenWidth: this.screenWidth,
      initialReferrer: this.initialReferrer,
      utmSource: this.utmSource,
      utmMedium: this.utmMedium,
      utmCampaign: this.utmCampaign,
      deviceId: this.deviceId,
    }
  }

  private getDistinctDeviceId() {
    const potentialStored = this.app.localStorage.getItem(distinctIdKey)
    if (potentialStored) {
      return potentialStored
    } else {
      const distinctId = `${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
      this.app.localStorage.setItem(distinctIdKey, distinctId)
      return distinctId
    }
  }

  private getReferrer() {
    const potentialStored = this.app.sessionStorage.getItem(refKey)
    if (potentialStored) {
      return potentialStored
    } else {
      const ref = document.referrer
      this.app.sessionStorage.setItem(refKey, ref)
      return ref
    }
  }
}
