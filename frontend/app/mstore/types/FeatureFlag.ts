import { makeAutoObservable } from 'mobx';
import Filter from 'App/mstore/types/filter';

export class Conditions {
  rolloutPercentage = 100;

  filter = new Filter().fromJson({ name: 'Rollout conditions', filters: [] });

  name = 'Condition Set';

  constructor(
    data?: Record<string, any>,
    isConditional?: boolean,
    isMobile?: boolean,
  ) {
    makeAutoObservable(this);
    this.name = data?.name;
    if (data && (data.rolloutPercentage || data.captureRate)) {
      this.rolloutPercentage = data.rolloutPercentage ?? data.captureRate;
      this.filter = new Filter([], isConditional, isMobile).fromJson(data);
    }
  }

  setRollout = (value: number) => {
    this.rolloutPercentage = value;
  };

  setName = (name: string) => {
    this.name = name;
  };

  toJS() {
    return {
      name: this.filter.name,
      rolloutPercentage: this.rolloutPercentage,
      filters: this.filter.filters.map((f) => f.toJson()),
    };
  }

  toCaptureCondition() {
    console.log(this.filter.filters);
    return {
      name: this.name,
      captureRate: this.rolloutPercentage,
      filters: this.filter.filters.map((f) => f.toJson()),
    };
  }
}

export class Variant {
  index: number;

  value: string = '';

  description: string = '';

  payload: string = '';

  rolloutPercentage: number = 100;

  constructor(index: number, data?: Record<string, any>) {
    makeAutoObservable(this);
    Object.assign(this, data);
    this.index = index;
  }

  setIndex = (index: number) => {
    this.index = index;
  };

  setKey = (key: string) => {
    this.value = key.replace(/\s/g, '-');
  };

  setDescription = (description: string) => {
    this.description = description;
  };

  setPayload = (payload: string) => {
    this.payload = payload;
  };

  setRollout = (rollout: number) => {
    if (rollout <= 100) {
      this.rolloutPercentage = rollout;
    }
  };
}
