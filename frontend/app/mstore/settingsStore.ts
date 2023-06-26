import { makeAutoObservable, observable } from 'mobx';
import SessionSettings from './types/sessionSettings';
import { sessionService } from 'App/services';
import { toast } from 'react-toastify';
import Webhook, { IWebhook } from 'Types/webhook';
import { webhookService } from 'App/services';
import { GettingStarted } from './types/gettingStarted';

export default class SettingsStore {
  loadingCaptureRate: boolean = false;
  sessionSettings: SessionSettings = new SessionSettings();
  captureRateFetched: boolean = false;
  limits: any = null;
  webhooks: Webhook[] = [];
  webhookInst = new Webhook();
  hooksLoading = false;
  gettingStarted: GettingStarted = new GettingStarted();

  constructor() {
    makeAutoObservable(this, {
      sessionSettings: observable,
    });
  }

  saveCaptureRate(projectId: number, data: any) {
    return sessionService
      .saveCaptureRate(projectId, data)
      .then((data) => data.json())
      .then(({ data }) => {
        this.sessionSettings.merge({
          captureRate: data.rate,
          captureAll: data.captureAll,
        });
        toast.success('Settings updated successfully');
      })
      .catch((err) => {
        toast.error('Error saving capture rate');
      });
  }

  fetchCaptureRate(projectId: number): Promise<any> {
    this.loadingCaptureRate = true;
    return sessionService
      .fetchCaptureRate(projectId)
      .then((data) => {
        this.sessionSettings.merge({
          captureRate: data.rate,
          captureAll: data.captureAll,
        });
        this.captureRateFetched = true;
      })
      .finally(() => {
        this.loadingCaptureRate = false;
      });
  }

  fetchWebhooks = () => {
    this.hooksLoading = true;
    return webhookService.fetchList().then((data) => {
      this.webhooks = data.map((hook) => new Webhook(hook));
      this.hooksLoading = false;
    });
  };

  initWebhook = (inst?: Partial<IWebhook> | Webhook) => {
    this.webhookInst = inst instanceof Webhook ? inst : new Webhook(inst);
  };

  saveWebhook = (inst: Webhook) => {
    this.hooksLoading = true;
    return webhookService
      .saveWebhook(inst)
      .then((data) => {
        this.webhookInst = new Webhook(data);
        if (inst.webhookId === undefined) this.setWebhooks([...this.webhooks, this.webhookInst]);
        else
          this.setWebhooks([
            ...this.webhooks.filter((hook) => hook.webhookId !== data.webhookId),
            this.webhookInst,
          ]);
      })
      .finally(() => {
        this.hooksLoading = false;
      });
  };

  setWebhooks = (webhooks: Webhook[]) => {
    this.webhooks = webhooks;
  };

  removeWebhook = (hookId: string) => {
    this.hooksLoading = true;
    return webhookService.removeWebhook(hookId).then(() => {
      this.webhooks = this.webhooks.filter((hook) => hook.webhookId !== hookId);
      this.hooksLoading = false;
    });
  };

  editWebhook = (diff: Partial<IWebhook>) => {
    Object.assign(this.webhookInst, diff);
  };
}
