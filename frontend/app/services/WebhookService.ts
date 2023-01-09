import BaseService from './BaseService';
import Webhook, { IWebhook } from "Types/webhook";

export default class WebhookService extends BaseService {
  fetchList(): Promise<IWebhook[]> {
    return this.client.get('/webhooks')
      .then(r => r.json())
      .then(j => j.data || [])
      .catch(Promise.reject)
  }

  saveWebhook(inst: Webhook) {
    return this.client.put('/webhooks', inst)
      .then(r => r.json())
      .then(j => j.data || {})
      .catch(Promise.reject)
  }

  removeWebhook(id: Webhook["webhookId"]) {
    return this.client.delete('/webhooks/' + id)
      .then(r => r.json())
      .then(j => j.data || {})
      .catch(Promise.reject)
  }
}