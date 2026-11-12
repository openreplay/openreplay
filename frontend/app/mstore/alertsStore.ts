import Alert, { IAlert } from 'Types/alert';
import { action, makeAutoObservable, runInAction } from 'mobx';

import { alertsService } from 'App/services';

export type TriggerGroup = 'cards' | 'predefined' | 'events' | 'users';

export interface TriggerOption {
  label: string;
  value: string | number;
  unit?: string;
  group: TriggerGroup;
  /** a property the project sends, not one OpenReplay captures */
  custom?: boolean;
}

const groupOf = (o: {
  value: string | number;
  source?: string;
  predefined?: boolean;
}): TriggerGroup => {
  if (o.source === 'events' || o.source === 'users') return o.source;
  if (o.source === 'metrics') return 'cards';
  if (o.source === 'predefined' || o.predefined) return 'predefined';
  return typeof o.value === 'number' ? 'cards' : 'predefined';
};

export default class AlertsStore {
  alerts: Alert[] = [];

  triggerOptions: TriggerOption[] = [];

  alertsSearch = '';

  // @ts-ignore
  instance: Alert = new Alert({}, false);

  loading = false;

  page: number = 1;

  constructor() {
    makeAutoObservable(this);
  }

  changeSearch = (value: string) => {
    this.alertsSearch = value;
    this.page = 1;
  };

  // TODO: remove it
  updateKey(key: string, value: any) {
    // @ts-ignore
    this[key] = value;
  }

  fetchList = async () => {
    this.setLoading(true);
    try {
      const list = await alertsService.fetchList();
      this.setAlerts(list.map((alert) => new Alert(alert, true)));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      this.setLoading(false);
    }
  };

  setAlerts = (alerts: Alert[]) => {
    this.alerts = alerts;
  };

  setLoading = (val: boolean) => {
    this.loading = val;
  };

  save = (inst: Alert): Promise<void> =>
    new Promise<void>(async (resolve, reject) => {
      this.setLoading(true);
      try {
        await alertsService.save(inst || this.instance);
        this.instance.isExists = true;
        resolve();
      } catch (e) {
        console.error(e);
        reject(e);
      } finally {
        this.setLoading(false);
      }
    });

  /** Saves the stored alert under a new name; unsaved form edits stay unsaved. */
  rename = async (id: string, name: string) => {
    const saved = this.alerts.find((a) => String(a.alertId) === id);
    if (!saved) throw new Error(`alert ${id} is not loaded`);
    const next = new Alert(
      { ...JSON.parse(JSON.stringify(saved.toData())), name },
      true,
    );
    this.setLoading(true);
    try {
      await alertsService.save(next);
      // in place: a new list would re-init the open form and drop its edits
      runInAction(() => {
        saved.name = name;
        if (String(this.instance.alertId) === id) this.instance.name = name;
      });
    } finally {
      this.setLoading(false);
    }
  };

  remove = (id: string): Promise<void> =>
    new Promise<void>(async (resolve, reject) => {
      this.setLoading(true);
      try {
        await alertsService.remove(id);
        this.setAlerts(this.alerts.filter((a) => String(a.alertId) !== id));
        resolve();
      } catch (e) {
        console.error(e);
        reject(e);
      } finally {
        this.setLoading(false);
      }
    });

  fetchTriggerOptions = async () => {
    this.setLoading(true);
    try {
      const options = await alertsService.fetchTriggerOptions();
      this.triggerOptions = options.map((o) => {
        const group = groupOf(o);
        return {
          label: o.name,
          value: o.value,
          unit: o.unit,
          group,
          custom:
            (group === 'events' || group === 'users') &&
            String(o.value).startsWith('properties.'),
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  /** The editor works on a copy: unsaved edits must not show in the list. */
  init = (inst: Partial<IAlert> | Alert) => {
    this.instance =
      inst instanceof Alert
        ? new Alert(JSON.parse(JSON.stringify(inst.toData())), inst.isExists)
        : new Alert(inst, false);
  };

  edit = (diff: Partial<Alert>) => {
    const key = Object.keys(diff)[0];
    const oldInst = this.instance;
    // @ts-ignore
    oldInst[key] = diff[key];

    this.instance = oldInst;
  };

  changeUnit = ({ value }: { value: string }) => {
    this.instance.change = value;
  };
}
