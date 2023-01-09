import { makeAutoObservable } from 'mobx'
import Alert, { IAlert } from 'Types/alert'
import { alertsService } from 'App/services'

export default class AlertsStore {
  alerts: Alert[] = [];
  triggerOptions: { label: string, value: string | number, unit?: string }[] = [];
  alertsSearch = '';
  // @ts-ignore
  instance: Alert = new Alert({}, false);
  loading = false

  constructor() {
    makeAutoObservable(this);
  }

  changeSearch = (value: string) => {
    this.alertsSearch = value;
  }

  fetchList = async () => {
    this.loading = true
    try {
      const list = await alertsService.fetchList();
      this.alerts = list.map(alert => new Alert(alert, true));
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }

  save = async (inst: Alert) => {
    this.loading = true
    try {
      await alertsService.save(inst ? inst : this.instance)
      this.instance.isExists = true
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }

  remove = async (id: string) => {
    this.loading = true
    try {
      await alertsService.remove(id)
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }

  fetchTriggerOptions = async () => {
    this.loading = true
    try {
      const options = await alertsService.fetchTriggerOptions();
      this.triggerOptions = options.map(({ name, value }) => ({ label: name, value }))
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }

  init = (inst: Partial<IAlert> | Alert) => {
    this.instance = inst instanceof Alert ? inst : new Alert(inst, false)
  }

  edit = (diff: Partial<Alert>) => {
    Object.assign(this.instance, diff)
  }
}