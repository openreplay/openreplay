import { makeAutoObservable } from "mobx";
import { SingleFFlag } from 'App/services/FFlagsService';
import Filter from "App/mstore/types/filter";

export class Conditions {
  rolloutPercentage = 100;
  filter = new Filter().fromJson({ name: 'Rollout conditions', filters: [] })

  constructor(data?: Record<string, any>) {
    makeAutoObservable(this)
    if (data) {
      this.rolloutPercentage = data.rolloutPercentage
      this.filter = new Filter().fromJson(data)
    }
  }

  setRollout = (value: number) => {
    this.rolloutPercentage = value
  }

  toJS() {
    return {
      name: this.filter.name,
      rolloutPercentage: this.rolloutPercentage,
      filters: this.filter.filters.map(f => f.toJson()),
    }
  }
}

const initData = {
  flagKey: '',
  isActive: false,
  isPersist: false,
  isSingleOption: true,
  conditions: [],
  description: '',
  featureFlagId: 0,
  createdAt: 0,
  updatedAt: 0,
  createdBy: 0,
  updatedBy: 0,
}

export class Variant {
  index: number;
  value: string = '';
  description: string = '';
  payload: string = '';
  rolloutPercentage: number = 100;

  constructor(index: number, data?: Record<string, any>) {
    Object.assign(this, data)
    this.index = index;
    makeAutoObservable(this)
  }

  setIndex = (index: number) => {
    this.index = index;
  }

  setKey = (key: string) => {
    this.value = key.replace(/\s/g, '-');
  }

  setDescription = (description: string) => {
    this.description = description;
  }

  setPayload = (payload: string) => {
    this.payload = payload;
  }

  setRollout = (rollout: number) => {
    if (rollout <= 100) {
      this.rolloutPercentage = rollout;
    }
  }
}

export default class FeatureFlag {
  flagKey: SingleFFlag['flagKey']
  conditions: Conditions[]
  createdBy?: SingleFFlag['createdBy']
  createdAt?: SingleFFlag['createdAt']
  updatedAt?: SingleFFlag['updatedAt']
  updatedBy?: SingleFFlag['updatedBy']
  isActive: SingleFFlag['isActive']
  description: SingleFFlag['description']
  isPersist: SingleFFlag['isPersist']
  isSingleOption: boolean
  featureFlagId: SingleFFlag['featureFlagId']
  payload: SingleFFlag['payload']
  flagType: string;
  variants: Variant[] = [];

  constructor(data?: SingleFFlag) {
    Object.assign(
      this,
      initData,
      {
        ...data,
        isSingleOption: data ? data.flagType === 'single' : true,
        conditions: data?.conditions?.map(c => new Conditions(c)) || [new Conditions()],
        variants: data?.flagType === 'multi' ? data?.variants?.map((v, i) => new Variant(i, v)) : [new Variant(1)],
      });

    makeAutoObservable(this);
  }

  setPayload = (payload: string) => {
    this.payload = payload;
  }

  addVariant = () => {
    this.variants.push(new Variant(this.variants.length + 1))
    this.redistributeVariants()
  }

  removeVariant = (index: number) => {
    this.variants = this.variants.filter(v => v.index !== index)
  }

  get isRedDistribution() {
    const totalRollout = this.variants.reduce((acc, v) => acc + v.rolloutPercentage, 0)

    return Math.floor(
      totalRollout/this.variants.length) !== Math.floor(100 / this.variants.length)
  }

  redistributeVariants = () => {
    const newRolloutDistribution = Math.floor(100 / this.variants.length)
    this.variants.forEach(v => v.setRollout(newRolloutDistribution))
  }

  toJS() {
    return {
      flagKey: this.flagKey,
      conditions: this.conditions.map(c => c.toJS()),
      createdBy: this.createdBy,
      updatedBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive,
      description: this.description,
      isPersist: this.isPersist,
      flagType: this.isSingleOption ? 'single' as const : 'multi' as const,
      featureFlagId: this.featureFlagId,
      variants: this.isSingleOption ? undefined : this.variants.map(v => ({ value: v.value, description: v.description, payload: v.payload, rolloutPercentage: v.rolloutPercentage })),
    }
  }

  addCondition = () => {
    this.conditions.push(new Conditions())
  }

  removeCondition = (index: number) => {
    this.conditions.splice(index, 1)
  }

  setFlagKey = (flagKey: string) => {
    this.flagKey = flagKey;
  }

  setDescription = (description: string) => {
    this.description = description;
  }

  setIsPersist = (isPersist: boolean) => {
    this.isPersist = isPersist;
  }

  setIsSingleOption = (isSingleOption: boolean) => {
    this.isSingleOption = isSingleOption;
  }

  setIsEnabled = (isEnabled: boolean) => {
    this.isActive = isEnabled;
  }
}