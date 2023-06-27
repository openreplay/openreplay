export interface RequestResponseData {
  readonly status: number
  readonly method: string
  url: string
  request: {
    body: Record<string, any> | string | null
    headers: Record<string, string>
  }
  response: {
    body: Record<string, any> | string | null
    headers: Record<string, string>
  }
}

// we only support sanitizing for json/string data because how you're gonna sanitize binary data?
