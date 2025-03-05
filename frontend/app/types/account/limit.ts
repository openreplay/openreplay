import { makeAutoObservable } from 'mobx';

interface ILimitValue {
  limit: number;
  remaining: number;
}

export interface ILimits {
  teamMember: ILimitValue;
  sites: ILimitValue;
}

const defaultValues = { limit: 0, remaining: 0 };

export default class Limit {
  teamMember = defaultValues;

  sites = defaultValues;

  constructor(data: Record<string, any>) {
    Object.assign(this, data);
    makeAutoObservable(this);
  }
}
