import { projectStore } from '@/mstore/index';
import { toast } from '@/ui/overlays/toast';
import Webhook, { IWebhook } from 'Types/webhook';
import { makeAutoObservable, observable, runInAction } from 'mobx';

import { MENU_COLLAPSED } from 'App/constants/storageKeys';
import { sessionService, webhookService } from 'App/services';

import { GettingStarted } from './types/gettingStarted';
import SessionSettings from './types/sessionSettings';

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
  saving: boolean = false;
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

  saveCaptureRate = (projectId: number, data: any) =>
    sessionService
      .saveCaptureRate(projectId, data)
      .then((data) => data.json())
      .then(({ data }) => {
        this.sessionSettings.merge({
          captureRate: data.rate,
          conditionalCapture: data.conditionalCapture,
        });
        toast.success('Settings updated successfully');
        return true;
      })
      .catch(() => {
        toast.error('Error saving capture rate');
        return false;
      });

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

  /** The project whose capture settings are in `sessionSettings`; null while
      another project's are loading, so nothing can be saved across projects. */
  captureConditionsFor: number | null = null;

  private captureSeq = 0;

  fetchCaptureConditions = async (projectId: number): Promise<any> => {
    const seq = ++this.captureSeq;
    this.loadingCaptureRate = true;
    this.captureConditionsFor = null;
    try {
      const data = await sessionService.fetchCaptureConditions(projectId);
      if (seq !== this.captureSeq) return;
      runInAction(() => {
        this.sessionSettings.merge({
          captureRate: data.rate,
          conditionalCapture: data.conditionalCapture,
          captureConditions: data.conditions,
        });
        this.captureConditionsFor = projectId;
      });
    } catch (e) {
      if (seq === this.captureSeq)
        toast.error('Could not load capture settings');
    } finally {
      if (seq === this.captureSeq)
        runInAction(() => {
          this.loadingCaptureRate = false;
        });
    }
  };

  /** Resolves to whether the settings were saved. */
  updateCaptureConditions = (
    projectId: number,
    data: CaptureConditions,
  ): Promise<boolean> => {
    if (this.captureConditionsFor !== projectId) return Promise.resolve(false);
    this.loadingCaptureRate = true;
    const duplicates = data.conditions.filter(
      (c, index) =>
        data.conditions.findIndex((c2) => c2.name === c.name) !== index,
    );
    if (duplicates.length > 0) {
      toast.error('Condition set names must be unique');
      this.loadingCaptureRate = false;
      return Promise.resolve(false);
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

        try {
          projectStore.syncProjectInList({
            id: `${projectId}`,
            sampleRate: data.rate,
          });
        } catch (e) {
          console.error('Failed to update project in list:', e);
        }
        toast.success('Settings updated successfully');
        return true;
      })
      .catch(() => {
        toast.error('Error saving capture rate');
        return false;
      })
      .finally(() => {
        this.loadingCaptureRate = false;
      });
  };

  fetchWebhooks = async () => {
    this.hooksLoading = true;
    try {
      const data = await webhookService.fetchList();
      runInAction(() => {
        this.webhooks = data.map((hook) => new Webhook(hook));
      });
    } catch (e) {
      console.error('Failed to load webhooks', e);
    } finally {
      runInAction(() => {
        this.hooksLoading = false;
      });
    }
  };

  initWebhook = (inst?: Partial<IWebhook> | Webhook) => {
    this.webhookInst = inst instanceof Webhook ? inst : new Webhook(inst);
  };

  saveWebhook = async (inst: Webhook) => {
    this.saving = true;
    try {
      const data = await webhookService.saveWebhook(inst);
      this.webhookInst = new Webhook(data);
      if (inst.webhookId === undefined) {
        this.setWebhooks([...this.webhooks, this.webhookInst]);
      } else {
        this.setWebhooks([
          ...this.webhooks.filter((hook) => hook.webhookId !== data.webhookId),
          this.webhookInst,
        ]);
      }
    } finally {
      this.saving = false;
    }
  };

  setWebhooks = (webhooks: Webhook[]) => {
    this.webhooks = webhooks;
  };

  /** Rejects on failure (the caller toasts); the list is untouched then. */
  removeWebhook = async (hookId: string) => {
    this.hooksLoading = true;
    try {
      await webhookService.removeWebhook(hookId);
      runInAction(() => {
        this.webhooks = this.webhooks.filter(
          (hook) => hook.webhookId !== hookId,
        );
      });
    } finally {
      runInAction(() => {
        this.hooksLoading = false;
      });
    }
  };

  editWebhook = (diff: Partial<IWebhook>) => {
    Object.assign(this.webhookInst, diff);
  };
}
