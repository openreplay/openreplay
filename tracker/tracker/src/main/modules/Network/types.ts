export interface RequestResponseData {
  readonly status: number
  readonly method: string
  url: string
  request: {
    body: string | null
    headers: Record<string, string>
  }
  response: {
    body: string | null
    headers: Record<string, string>
  }
}

// we only support sanitizing for json/string data because how you're gonna sanitize binary data?
