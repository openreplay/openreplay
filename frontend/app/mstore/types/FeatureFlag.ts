import { makeAutoObservable } from "mobx";
import { SingleFFlag } from 'App/services/FFlagsService';
import Filter from "App/mstore/types/filter";
import { flagConditionFilters } from "Types/filter/newFilter";

class Conditions {
  rolloutPercentage = 100;
  filter = new Filter().fromJson({ name: 'Rollout conditions', filters: [] })

  constructor(data?: Record<string, any>) {
    makeAutoObservable(this)
    if (data) {
      this.rolloutPercentage = data.rolloutPercentage
      this.filter = new Filter().fromJson(data)
    } else {
      this.filter.addFilter(flagConditionFilters[0])
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
  name: 'New Feature Flag',
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

class Variant {
  index: number;
  key: string = '';
  description: string = '';
  payload: string = '';
  rollout: number = 100;

  constructor(index) {
    makeAutoObservable(this)
    this.index = index;
  }

  setIndex = (index: number) => {
    this.index = index;
  }

  setKey = (key: string) => {
    this.key = key.replace(/\s/g, '-');
  }

  setDescription = (description: string) => {
    this.description = description;
  }

  setPayload = (payload: string) => {
    this.payload = payload;
  }

  setRollout = (rollout: number) => {
    if (rollout <= 100) {
      this.rollout = rollout;
    }
  }
}

export default class FeatureFlag {
  flagKey: SingleFFlag['flagKey']
  conditions: SingleFFlag['conditions']
  createdBy?: SingleFFlag['createdBy']
  createdAt?: SingleFFlag['createdAt']
  updatedAt?: SingleFFlag['updatedAt']
  isActive: SingleFFlag['isActive']
  description: SingleFFlag['description']
  isPersist: SingleFFlag['isPersist']
  isSingleOption: boolean
  featureFlagId: SingleFFlag['featureFlagId']
  name: SingleFFlag['name'];
  flagType: string;
  variants: Variant[] = [new Variant(1)];

  constructor(data: SingleFFlag) {
    Object.assign(
      this,
      initData,
      {
        ...data,
        isSingleOption: data?.flagType === 'single' || true,
        conditions: data?.conditions?.map(c => new Conditions(c)) || [new Conditions()],
      });

    makeAutoObservable(this);
  }

  addVariant = () => {
    this.variants.push(new Variant(this.variants.length + 1))
    this.redistributeVariants()
  }

  removeVariant = (index: number) => {
    this.variants = this.variants.filter(v => v.index !== index)
  }

  get isRedDistribution() {
    console.log(this.variants, Math.floor(this.variants.reduce((acc, v) => acc + v.rollout, 0)/this.variants.length), Math.floor(100 / this.variants.length))
    return Math.floor(this.variants.reduce((acc, v) => acc + v.rollout, 0)/this.variants.length) !== Math.floor(100 / this.variants.length)
  }

  redistributeVariants = () => {
    const newRolloutDistribution = Math.floor(100 / this.variants.length)
    this.variants.forEach(v => v.setRollout(newRolloutDistribution))
  }

  toJS() {
    return {
      name: this.name,
      flagKey: this.flagKey,
      conditions: this.conditions.map(c => c.toJS()),
      createdBy: this.createdBy,
      updatedBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive,
      description: this.description,
      isPersist: this.isPersist,
      flagType: this.isSingleOption ? 'single' : 'multi',
      featureFlagId: this.featureFlagId,
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

  setName = (name: string) => {
    this.name = name;
  }
}