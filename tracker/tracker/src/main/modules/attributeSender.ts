import {
  SetNodeAttributeDictGlobal,
  SetNodeAttribute,
  Type,
} from '../../common/messages.gen.js'
import App from '../app/index.js'

export class StringDictionary {
  private lastTs = 0
  private lastSuffix = 1
  /** backwards dictionary of
   * [repeated str:key]
   * */
  private backDict: Record<string, number> = {}

  getKey = (str: string): [number, boolean] => {
    let isNew = false
    if (!this.backDict[str]) {
      isNew = true
      // shaving the first 2 digits of the timestamp (since they are irrelevant for next millennia)
      const shavedTs = Date.now() % 10 ** (13 - 2)
      let id: number = shavedTs
      if (id === this.lastTs) {
        id = id * 10000 + this.lastSuffix
        this.lastSuffix += 1
      } else {
        this.lastSuffix = 1
      }
      this.backDict[str] = id
      this.lastTs = shavedTs
    }
    return [this.backDict[str], isNew]
  }
}

export default class AttributeSender {
  private dict: StringDictionary
  private readonly app: App
  private readonly isDictDisabled: boolean
  constructor(options: { app: App; isDictDisabled: boolean }) {
    this.app = options.app
    this.isDictDisabled = options.isDictDisabled
    this.dict = new StringDictionary()
  }

  public sendSetAttribute = (id: number, name: string, value: string) => {
    if (this.isDictDisabled) {
      const msg: SetNodeAttribute = [Type.SetNodeAttribute, id, name, value]
      return this.app.send(msg)
    } else {
      const message: SetNodeAttributeDictGlobal = [
        Type.SetNodeAttributeDictGlobal,
        id,
        this.applyDict(name),
        this.applyDict(value),
      ]
      return this.app.send(message)
    }
  }

  private applyDict(str: string): number {
    const [key, isNew] = this.dict.getKey(str)
    if (isNew) {
      this.app.send([Type.StringDictGlobal, key, str])
    }
    return key
  }

  clear() {
    this.dict = new StringDictionary()
  }
}
