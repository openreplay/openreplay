import { makeAutoObservable } from 'mobx';

export default class Client {
  apiKey?: string = undefined;

  tenantId?: number = undefined;

  name?: string = undefined;

  tenantKey: string = '';

  optOut = true;

  edition: string = '';

  constructor(data: Record<string, any> = {}) {
    Object.assign(this, data);
    makeAutoObservable(this);
  }
}
