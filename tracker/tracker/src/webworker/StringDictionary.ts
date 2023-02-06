export default class StringDictionary {
  private idx = 0
  private backDict: Record<string, string> = {}

  getKey(str: string): [string, boolean] {
    let isNew = false
    if (!this.backDict[str]) {
      isNew = true
      this.backDict[str] = `${this.idx++}`
    }
    return [this.backDict[str], isNew]
  }
}
