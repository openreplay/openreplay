import { makeAutoObservable } from "mobx";
import { SingleFFlag } from 'App/services/FFlagsService';

const initData = {
  name: 'New Feature Flag',
  flagKey: '',
  isActive: false,
  isPersist: false,
  isSingleOption: true,
  conditions: [],
  description: '',
  featureFlagId: 0,
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
    Object.assign(this, initData, data)

    makeAutoObservable(this);
  }

  toJS() {
    return {
      name: this.name,
      flagKey: this.flagKey,
      conditions: this.conditions,
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