interface ClientData {
  screen: string
  width: number
  height: number
  browser: string
  browserVersion: string
  browserMajorVersion: number
  mobile: boolean
  os: string
  osVersion: string
  cookies: boolean
}

/**
 * Detects client browser, OS, and device information
 */
export function uaParse(
  sWindow: Window & typeof globalThis,
  onOsVersionUpdate?: (osVersion: string) => void,
): ClientData {
  const unknown = '-'

  // Screen detection
  let width: number = 0
  let height: number = 0
  let screenSize = ''

  if (sWindow.screen.width) {
    width = sWindow.screen.width
    height = sWindow.screen.height
    screenSize = `${width} x ${height}`
  }

  // Browser detection
  const nVer: string = sWindow.navigator.appVersion ?? '0'
  const nAgt: string = sWindow.navigator.userAgent ?? 'unknown'
  let browser: string = sWindow.navigator.appName ?? "unknown"
  let version: string = String(parseFloat(nVer))
  let nameOffset: number
  let verOffset = -1

  // [UA token, name, prefer the `Version/` token]; the version starts one char after the token
  const browsers: [string, string, boolean?][] = [
    ['YaBrowser', 'Yandex'],
    ['SamsungBrowser', 'Samsung'],
    ['UCBrowser', 'UC Browser'],
    ['OPR', 'Opera'],
    ['Opera', 'Opera', true],
    ['Edge', 'Microsoft Legacy Edge'],
    ['Edg', 'Microsoft Edge'],
    ['MSIE', 'Microsoft Internet Explorer'],
    ['Chrome', 'Chrome'],
    ['Safari', 'Safari', true],
    ['Firefox', 'Firefox'],
  ]
  const known = browsers.find(([token]) => (verOffset = nAgt.indexOf(token)) !== -1)
  if (known) {
    browser = known[1]
    version = nAgt.substring(verOffset + known[0].length + 1)
    if (known[2] && (verOffset = nAgt.indexOf('Version')) !== -1) {
      version = nAgt.substring(verOffset + 8)
    }
  } else if (nAgt.indexOf('Trident/') !== -1) {
    browser = 'Microsoft Internet Explorer'
    version = nAgt.substring(nAgt.indexOf('rv:') + 3)
  } else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/'))) {
    browser = nAgt.substring(nameOffset, verOffset)
    version = nAgt.substring(verOffset + 1)
    if (browser.toLowerCase() === browser.toUpperCase()) {
      browser = sWindow.navigator.appName
    }
  }

  version = version.split(/[; )]/)[0]

  let majorVersion: number = parseInt(version, 10)
  if (isNaN(majorVersion)) {
    version = String(parseFloat(nVer))
    majorVersion = parseInt(nVer, 10)
  }

  // Mobile detection
  const mobile: boolean = /Mobile|mini|Fennec|Android|iP(ad|od|hone)/.test(nVer)

  // Cookie detection
  let cookieEnabled: boolean = sWindow.navigator.cookieEnabled || false

  if (typeof navigator.cookieEnabled === 'undefined' && !cookieEnabled) {
    sWindow.document.cookie = 'testcookie'
    cookieEnabled = sWindow.document.cookie.indexOf('testcookie') !== -1
  }

  // OS detection
  const clientStrings: [string, RegExp][] = [
    ['Windows 10', /Windows 10.0|Windows NT 10.0/],
    ['Windows 8.1', /Windows 8.1|Windows NT 6.3/],
    ['Windows 8', /Windows 8|Windows NT 6.2/],
    ['Windows 7', /Windows 7|Windows NT 6.1/],
    ['Windows Vista', /Windows NT 6.0/],
    ['Windows Server 2003', /Windows NT 5.2/],
    ['Windows XP', /Windows NT 5.1|Windows XP/],
    ['Windows 2000', /Windows NT 5.0|Windows 2000/],
    ['Windows ME', /Win 9x 4.90|Windows ME/],
    ['Windows 98', /Windows 98|Win98/],
    ['Windows 95', /Windows 95|Win95|Windows_95/],
    ['Windows NT 4.0', /Windows NT 4.0|WinNT4.0|WinNT|Windows NT/],
    ['Windows CE', /Windows CE/],
    ['Windows 3.11', /Win16/],
    ['Android', /Android/],
    ['Open BSD', /OpenBSD/],
    ['Sun OS', /SunOS/],
    ['Chrome OS', /CrOS/],
    ['Linux', /Linux|X11(?!.*CrOS)/],
    ['iOS', /iPhone|iPad|iPod/],
    ['Mac OS X', /Mac OS X/],
    ['Mac OS', /Mac OS|MacPPC|MacIntel|Mac_PowerPC|Macintosh/],
    ['QNX', /QNX/],
    ['UNIX', /UNIX/],
    ['BeOS', /BeOS/],
    ['OS/2', /OS\/2/],
    ['Search Bot', /nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver/],
  ]
  let os = clientStrings.find(([, r]) => r.test(nAgt))?.[0] ?? unknown

  // OS Version detection
  let osVersion: string = unknown

  if (/Windows/.test(os)) {
    const matches = /Windows (.*)/.exec(os)
    if (matches && matches[1]) {
      osVersion = matches[1]
      // Handle Windows 10/11 detection with newer API if available
      if (osVersion === '10' && 'userAgentData' in sWindow.navigator) {
        const nav = navigator as Navigator & {
          userAgentData?: {
            getHighEntropyValues(values: string[]): Promise<{ platformVersion: string }>
          }
        }

        if (nav.userAgentData) {
          nav.userAgentData
            .getHighEntropyValues(['platformVersion'])
            .then((ua) => {
              const version = parseInt(ua.platformVersion.split('.')[0], 10)
              // uaParse has already returned by the time this resolves, so a local
              // assignment would be lost - notify the caller to update its state.
              const refined = version < 13 ? '10' : '11'
              osVersion = refined
              onOsVersionUpdate?.(refined)
            })
            .catch(() => {
              // ignore errors and keep osVersion as is
            })
        }
      }
    }
    os = 'Windows'
  }

  // OS version detection for Mac/Android/iOS
  switch (os) {
    case 'Mac OS':
    case 'Mac OS X':
    case 'Android': {
      const matches =
        /(?:Android|Mac OS|Mac OS X|MacPPC|MacIntel|Mac_PowerPC|Macintosh) ([\.\_\d]+)/.exec(nAgt)
      osVersion = matches && matches[1] ? matches[1] : unknown
      break
    }
    case 'iOS': {
      const matches = /OS (\d+)_(\d+)_?(\d+)?/.exec(nVer)
      if (matches && matches[1]) {
        osVersion = `${matches[1]}.${matches[2]}.${parseInt(matches[3] || '0', 10)}`
      }
      break
    }
  }

  // Return client data
  return {
    screen: screenSize,
    width,
    height,
    browser,
    browserVersion: version,
    browserMajorVersion: majorVersion,
    mobile,
    os,
    osVersion,
    cookies: cookieEnabled,
  }
}

export function isObject(item: any): boolean {
  const isNull = item === null
  return Boolean(item && typeof item === 'object' && !Array.isArray(item) && !isNull)
}

export { getTimezone as getUTCOffsetString } from '../../utils.js'
