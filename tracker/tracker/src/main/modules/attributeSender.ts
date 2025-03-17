import { SetNodeAttributeDict, SetNodeAttribute, Type } from '../../common/messages.gen.js'
import App from '../app/index.js'

export class StringDictionary {
  private idx = 1
  /** backwards dictionary of
   * [repeated str:key]
   * */
  private backDict: Record<string, string> = {}

  constructor(private readonly getPageNo: () => number | undefined) {}

  getKey = (str: string): [string, boolean] => {
    let isNew = false
    const safeKey = `__${str}`
    if (!this.backDict[safeKey]) {
      isNew = true
      this.backDict[safeKey] = `${this.getPageNo() ?? 0}_${this.idx}`
      this.idx += 1
    }
    return [this.backDict[safeKey], isNew]
  }
}

export default class AttributeSender {
  private dict: StringDictionary
  private readonly app: App
  private readonly isDictDisabled: boolean
  constructor(options: { app: App; isDictDisabled: boolean }) {
    this.app = options.app
    this.isDictDisabled = options.isDictDisabled
    this.dict = new StringDictionary(this.app.session.getPageNumber)
  }

  public sendSetAttribute = (id: number, name: string, value: string) => {
    if (this.isDictDisabled) {
      const msg: SetNodeAttribute = [Type.SetNodeAttribute, id, name, value]
      return this.app.send(msg)
    } else {
      const message: SetNodeAttributeDict = [
        Type.SetNodeAttributeDict,
        id,
        this.applyDict(name),
        this.applyDict(value),
      ]
      return this.app.send(message)
    }
  }

  private applyDict(str: string): string {
    const [key, isNew] = this.dict.getKey(str)
    if (isNew) {
      this.app.send([Type.StringDict, key, str])
    }
    return key
  }

  clear() {
    this.dict = new StringDictionary(this.app.session.getPageNumber)
  }
}
