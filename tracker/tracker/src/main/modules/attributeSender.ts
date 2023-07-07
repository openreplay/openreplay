import { SetNodeAttributeDict, SetNodeAttribute, Type } from '../../common/messages.gen.js'
import App from '../app/index.js'

export class StringDictionary {
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

export default class AttributeSender {
  private dict = new StringDictionary()

  constructor(private readonly app: App, private readonly isDictDisabled: boolean) {}

  public sendSetAttribute(id: number, name: string, value: string) {
    if (this.isDictDisabled) {
      const msg: SetNodeAttribute = [Type.SetNodeAttribute, id, name, value]
      this.app.send(msg)
    }
    const message: SetNodeAttributeDict = [
      Type.SetNodeAttributeDict,
      id,
      this.applyDict(name),
      this.applyDict(value),
    ]
    this.app.send(message)
  }

  private applyDict(str: string): number {
    const [key, isNew] = this.dict.getKey(str)
    if (isNew) {
      this.app.send([Type.StringDict, key, str])
    }
    return key
  }

  clear() {
    this.dict = new StringDictionary()
  }
}
