import { makeAutoObservable, observable } from "mobx"
import SessionSettings from "./types/sessionSettings"
import { sessionService } from "App/services"
import { toast } from 'react-toastify';
import Webhook, { IWebhook } from 'Types/webhook';
import {
  webhookService
} from 'App/services';
import Alert, { IAlert } from "Types/alert";

export default class SettingsStore {
  loadingCaptureRate: boolean = false;
  sessionSettings: SessionSettings = new SessionSettings()
  captureRateFetched: boolean = false;
  limits: any = null;

  webhooks: Webhook[] = []
  webhookInst = new Webhook()

  hooksLoading = false

  constructor() {
    makeAutoObservable(this, {
      sessionSettings: observable,
    })
  }

  saveCaptureRate(data: any) {
    return sessionService.saveCaptureRate(data)
      .then(data => data.json())
      .then(({ data }) => {
        this.sessionSettings.merge({
          captureRate: data.rate,
          captureAll: data.captureAll
        })
        toast.success("Settings updated successfully");
      }).catch(err => {
        toast.error("Error saving capture rate");
      })
  }

  fetchCaptureRate(): Promise<any> {
    this.loadingCaptureRate = true;
    return sessionService.fetchCaptureRate()
      .then(data => {
        this.sessionSettings.merge({
          captureRate: data.rate,
          captureAll: data.captureAll
        })
        this.captureRateFetched = true;
      }).finally(() => {
        this.loadingCaptureRate = false;
      })
  }

  fetchWebhooks = () => {
    this.hooksLoading = true
    return webhookService.fetchList()
      .then(data => {
        this.webhooks = data.map(hook => new Webhook(hook))
        this.hooksLoading = false
      })
  }

  initWebhook = (inst: Partial<IWebhook> | Webhook) => {
    this.webhookInst = inst instanceof Webhook ? inst : new Webhook(inst)
  }

  saveWebhook = (inst: Webhook) => {
    this.hooksLoading = true
    return webhookService.saveWebhook(inst)
     .then(data => {
        this.webhookInst = new Webhook(data)
       this.hooksLoading = false
     })
  }

  removeWebhook = (hookId: string) => {
    this.hooksLoading = true
    return webhookService.removeWebhook(hookId)
      .then(() => {
        this.webhooks = this.webhooks.filter(hook => hook.webhookId!== hookId)
        this.hooksLoading = false
      })
  }

  editWebhook = (diff: Partial<IWebhook>) => {
    Object.assign(this.webhookInst, diff)
  }
}
