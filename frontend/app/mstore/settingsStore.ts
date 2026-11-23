import Webhook, { IWebhook } from 'Types/webhook';
import { makeAutoObservable, observable, runInAction } from 'mobx';

import { MENU_COLLAPSED } from 'App/constants/storageKeys';
import { webhookService } from 'App/services';

import SessionSettings from './types/sessionSettings';

export default class SettingsStore {
  sessionSettings: SessionSettings = new SessionSettings();
  limits: any = null;
  webhooks: Webhook[] = [];
  webhookInst = new Webhook();
  hooksLoading = false;
  saving: boolean = false;
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

  /** A page folds the menu for itself without storing it; `null` brings the stored choice back. */
  foldMenu = (folded: boolean | null) => {
    this.menuCollapsed =
      folded ?? localStorage.getItem(MENU_COLLAPSED) === 'true';
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
