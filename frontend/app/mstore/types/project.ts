import { makeAutoObservable } from 'mobx';
import GDPR from './gdpr';

export default class Project {
  id: string | null = null;
  name: string = '';
  host: string = '';
  platform: string = 'web';
  lastRecordedSessionAt: any = null;
  gdpr: GDPR = new GDPR();
  recorded: boolean = false;
  stackIntegrations: boolean = false;
  projectKey?: string = '';
  projectId: number | null = null;
  trackerVersion?: string = '';
  saveRequestPayloads: boolean = false;
  sampleRate: number = 0;
  conditionsCount: number = 0;

  constructor(data: Partial<Project> = {}) {
    const dataEmpty = Object.keys(data).length === 0;
    if (!dataEmpty) {
      Object.keys(data).forEach((key) => {
        if (key in this) {
          // @ts-ignore
          this[key] = data[key];
        }
      });
      this.gdpr = data.gdpr ? new GDPR(data.gdpr) : new GDPR();
      this.id = data.projectId?.toString() || data.id || null;
      this.host = data.name || '';
    }
    makeAutoObservable(this);
  }

  exists = () => !!this.id;

  get validate() {
    return this.name.length > 0;
  }

  edit = (data: Partial<Project>) => {
    Object.keys(data).forEach((key) => {
      if (key in this) {
        this[key] = data[key];
      } else {
        console.error(`Project: Unknown key ${key}`);
      }
    });
    return this;
  };

  toData = () => ({
    id: this.id,
    name: this.name,
    host: this.host,
    platform: this.platform,
    lastRecordedSessionAt: this.lastRecordedSessionAt,
    gdpr: this.gdpr.toData(),
    recorded: this.recorded,
    stackIntegrations: this.stackIntegrations,
    projectKey: this.projectKey,
    projectId: this.projectId,
    trackerVersion: this.trackerVersion,
    saveRequestPayloads: this.saveRequestPayloads,
    sampleRate: this.sampleRate,
    conditionsCount: this.conditionsCount,
  });
}
