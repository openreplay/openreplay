import { validateName, validateURL } from 'App/validate';
import { makeAutoObservable } from 'mobx'

export interface IWebhook {
  webhookId: string
  type: string
  name: string
  endpoint: string
  authHeader: string
}

export default class Webhook {
  webhookId: IWebhook["webhookId"]
  type: IWebhook["type"]
  name: IWebhook["name"] = ''
  endpoint: IWebhook["endpoint"] = ''
  authHeader: IWebhook["authHeader"] = ''

  constructor(data: Partial<IWebhook> = {}) {
    Object.assign(this, data)

    makeAutoObservable(this)
  }

  toData() {
    return { ...this };
  }

  validate() {
    return !!this.name && validateName(this.name) && !!this.endpoint && validateURL(this.endpoint);
  }

  exists() {
    return !!this.webhookId
  }
}