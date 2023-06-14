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