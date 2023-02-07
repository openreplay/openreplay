export default class StringDictionary {
  private idx = 1
  private backDict: Record<string, number> = {}

  getKey(str: string): [number, boolean] {
    let isNew = false
    if (!this.backDict[str]) {
      isNew = true
      this.backDict[str] = this.idx++
    }
    return [this.backDict[str], isNew]
  }
}
