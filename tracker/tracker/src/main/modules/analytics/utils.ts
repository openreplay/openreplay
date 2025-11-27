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

interface ClientOS {
  s: string
  r: RegExp
}

/**
 * Detects client browser, OS, and device information
 */
export function uaParse(sWindow: Window & typeof globalThis): ClientData {
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
  let verOffset: number
  let ix: number

  // Browser detection logic
  if ((verOffset = nAgt.indexOf('YaBrowser')) !== -1) {
    browser = 'Yandex'
    version = nAgt.substring(verOffset + 10)
  } else if ((verOffset = nAgt.indexOf('SamsungBrowser')) !== -1) {
    browser = 'Samsung'
    version = nAgt.substring(verOffset + 15)
  } else if ((verOffset = nAgt.indexOf('UCBrowser')) !== -1) {
    browser = 'UC Browser'
    version = nAgt.substring(verOffset + 10)
  } else if ((verOffset = nAgt.indexOf('OPR')) !== -1) {
    browser = 'Opera'
    version = nAgt.substring(verOffset + 4)
  } else if ((verOffset = nAgt.indexOf('Opera')) !== -1) {
    browser = 'Opera'
    version = nAgt.substring(verOffset + 6)
    if ((verOffset = nAgt.indexOf('Version')) !== -1) {
      version = nAgt.substring(verOffset + 8)
    }
  } else if ((verOffset = nAgt.indexOf('Edge')) !== -1) {
    browser = 'Microsoft Legacy Edge'
    version = nAgt.substring(verOffset + 5)
  } else if ((verOffset = nAgt.indexOf('Edg')) !== -1) {
    browser = 'Microsoft Edge'
    version = nAgt.substring(verOffset + 4)
  } else if ((verOffset = nAgt.indexOf('MSIE')) !== -1) {
    browser = 'Microsoft Internet Explorer'
    version = nAgt.substring(verOffset + 5)
  } else if ((verOffset = nAgt.indexOf('Chrome')) !== -1) {
    browser = 'Chrome'
    version = nAgt.substring(verOffset + 7)
  } else if ((verOffset = nAgt.indexOf('Safari')) !== -1) {
    browser = 'Safari'
    version = nAgt.substring(verOffset + 7)
    if ((verOffset = nAgt.indexOf('Version')) !== -1) {
      version = nAgt.substring(verOffset + 8)
    }
  } else if ((verOffset = nAgt.indexOf('Firefox')) !== -1) {
    browser = 'Firefox'
    version = nAgt.substring(verOffset + 8)
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

  // Trim the version string
  if ((ix = version.indexOf(';')) !== -1) {
    version = version.substring(0, ix)
  }
  if ((ix = version.indexOf(' ')) !== -1) {
    version = version.substring(0, ix)
  }
  if ((ix = version.indexOf(')')) !== -1) {
    version = version.substring(0, ix)
  }

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
  let os: string = unknown
  const clientStrings: ClientOS[] = [
    { s: 'Windows 10', r: /(Windows 10.0|Windows NT 10.0)/ },
    { s: 'Windows 8.1', r: /(Windows 8.1|Windows NT 6.3)/ },
    { s: 'Windows 8', r: /(Windows 8|Windows NT 6.2)/ },
    { s: 'Windows 7', r: /(Windows 7|Windows NT 6.1)/ },
    { s: 'Windows Vista', r: /Windows NT 6.0/ },
    { s: 'Windows Server 2003', r: /Windows NT 5.2/ },
    { s: 'Windows XP', r: /(Windows NT 5.1|Windows XP)/ },
    { s: 'Windows 2000', r: /(Windows NT 5.0|Windows 2000)/ },
    { s: 'Windows ME', r: /(Win 9x 4.90|Windows ME)/ },
    { s: 'Windows 98', r: /(Windows 98|Win98)/ },
    { s: 'Windows 95', r: /(Windows 95|Win95|Windows_95)/ },
    { s: 'Windows NT 4.0', r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/ },
    { s: 'Windows CE', r: /Windows CE/ },
    { s: 'Windows 3.11', r: /Win16/ },
    { s: 'Android', r: /Android/ },
    { s: 'Open BSD', r: /OpenBSD/ },
    { s: 'Sun OS', r: /SunOS/ },
    { s: 'Chrome OS', r: /CrOS/ },
    { s: 'Linux', r: /(Linux|X11(?!.*CrOS))/ },
    { s: 'iOS', r: /(iPhone|iPad|iPod)/ },
    { s: 'Mac OS X', r: /Mac OS X/ },
    { s: 'Mac OS', r: /(Mac OS|MacPPC|MacIntel|Mac_PowerPC|Macintosh)/ },
    { s: 'QNX', r: /QNX/ },
    { s: 'UNIX', r: /UNIX/ },
    { s: 'BeOS', r: /BeOS/ },
    { s: 'OS/2', r: /OS\/2/ },
    {
      s: 'Search Bot',
      r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/,
    },
  ]

  // Find matching OS
  for (const client of clientStrings) {
    if (client.r.test(nAgt)) {
      os = client.s
      break
    }
  }

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
              osVersion = version < 13 ? '10' : '11'
            })
            .catch(() => {
              // Fallback if high entropy values not available
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

export function getUTCOffsetString() {
  const date = new Date()
  const offsetMinutes = date.getTimezoneOffset()

  const hours = Math.abs(Math.floor(offsetMinutes / 60))
  const minutes = Math.abs(offsetMinutes % 60)

  const sign = offsetMinutes <= 0 ? '+' : '-'

  const hoursStr = hours.toString().padStart(2, '0')
  const minutesStr = minutes.toString().padStart(2, '0')

  return `UTC${sign}${hoursStr}:${minutesStr}`
}
