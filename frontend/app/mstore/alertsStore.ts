import { makeAutoObservable, action } from 'mobx';
import Alert, { IAlert } from 'Types/alert';
import { alertsService } from 'App/services';

export default class AlertsStore {
  alerts: Alert[] = [];

  triggerOptions: { label: string; value: string | number; unit?: string }[] =
    [];

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
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  setAlerts = (alerts: Alert[]) => {
    this.alerts = alerts;
  }

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

  remove = (id: string): Promise<void> =>
    new Promise<void>(async (resolve, reject) => {
      this.setLoading(true);
      try {
        await alertsService.remove(id);
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
      this.triggerOptions = options.map(({ name, value }) => ({
        label: name,
        value,
      }));
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  init = (inst: Partial<IAlert> | Alert) => {
    this.instance = inst instanceof Alert ? inst : new Alert(inst, false);
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
