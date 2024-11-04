import { makeAutoObservable, observable } from 'mobx';
import SessionSettings from './types/sessionSettings';
import { sessionService } from 'App/services';
import { toast } from 'react-toastify';
import Webhook, { IWebhook } from 'Types/webhook';
import { webhookService } from 'App/services';
import { GettingStarted } from './types/gettingStarted';
import { MENU_COLLAPSED } from 'App/constants/storageKeys';

interface CaptureConditions {
  rate: number;
  conditionalCapture: boolean;
  conditions: { name: string; captureRate: number; filters: any[] }[];
}

export default class SettingsStore {
  loadingCaptureRate: boolean = false;
  sessionSettings: SessionSettings = new SessionSettings();
  captureRateFetched: boolean = false;
  limits: any = null;
  webhooks: Webhook[] = [];
  webhookInst = new Webhook();
  hooksLoading = false;
  gettingStarted: GettingStarted = new GettingStarted();
  menuCollapsed: boolean = localStorage.getItem(MENU_COLLAPSED) === 'true';

  constructor() {
    makeAutoObservable(this, {
      sessionSettings: observable,
    });
  }

  updateMenuCollapsed = (collapsed: boolean) => {
    this.menuCollapsed = collapsed;
    localStorage.setItem(MENU_COLLAPSED, collapsed.toString());
  };

  saveCaptureRate = (projectId: number, data: any) => {
    return sessionService
      .saveCaptureRate(projectId, data)
      .then((data) => data.json())
      .then(({ data }) => {
        this.sessionSettings.merge({
          captureRate: data.rate,
          conditionalCapture: data.conditionalCapture,
        });
        toast.success('Settings updated successfully');
      })
      .catch((err) => {
        toast.error('Error saving capture rate');
      });
  };

  fetchCaptureRate = (projectId: number): Promise<any> => {
    this.loadingCaptureRate = true;
    return sessionService
      .fetchCaptureRate(projectId)
      .then((data) => {
        this.sessionSettings.merge({
          captureRate: data.rate,
          conditionalCapture: data.conditionalCapture,
        });
        this.captureRateFetched = true;
      })
      .finally(() => {
        this.loadingCaptureRate = false;
      });
  };

  fetchCaptureConditions = (projectId: number): Promise<any> => {
    this.loadingCaptureRate = true;
    return sessionService
      .fetchCaptureConditions(projectId)
      .then((data) => {
        this.sessionSettings.merge({
          captureRate: data.rate,
          conditionalCapture: data.conditionalCapture,
          captureConditions: data.conditions,
        });
      })
      .finally(() => {
        this.loadingCaptureRate = false;
      });
  };

  updateCaptureConditions = (projectId: number, data: CaptureConditions) => {
    this.loadingCaptureRate = true;
    const duplicates = data.conditions.filter(
      (c, index) => data.conditions.findIndex((c2) => c2.name === c.name) !== index
    );
    if (duplicates.length > 0) {
      toast.error('Condition set names must be unique');
      this.loadingCaptureRate = false;
      return;
    }
    return sessionService
      .saveCaptureConditions(projectId, data)
      .then((data) => data.json())
      .then(({ data }) => {
        this.sessionSettings.merge({
          captureRate: data.rate,
          conditionalCapture: data.conditionalCapture,
          captureConditions: data.conditions,
        });
        toast.success('Settings updated successfully');
      })
      .catch((err) => {
        toast.error('Error saving capture rate');
      })
      .finally(() => {
        this.loadingCaptureRate = false;
      });
  };

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
