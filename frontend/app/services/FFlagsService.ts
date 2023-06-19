import BaseService from 'App/services/BaseService';

type FFlagType = 'single' | 'multi';
type FFlagCondition = {
  name: string;
  rollout_percentage: number;
  filters: [];
};

export interface SimpleFlag {
  name: string;
  flagKey: string;
  description: string;
  flagType: FFlagType;
  isPersist: boolean;
  conditions: FFlagCondition[];
  payload?: string;
}

export interface FFlag extends SimpleFlag {
  featureFlagId: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: number;
  updatedBy: number;
  conditions: never;
}

export interface SingleFFlag extends SimpleFlag {
  createdAt: number;
  updatedAt: number;
  createdBy: number;
  updatedBy: number;
  featureFlagId: number;
  isActive: boolean;
  variants: {
    variantId?: number;
    value: string;
    description?: string;
    payload: string;
    rolloutPercentage: number;
  }[]
}

export default class FFlagsService extends BaseService {
  fetchFlags(filters: Record<string, any>): Promise<{ records: FFlag[]; total: number }> {
    return this.client
      .post('/feature-flags/search', filters)
      .then((r) => r.json())
      .then((j) => j.data || []);
  }

  createFlag(flag: SimpleFlag): Promise<FFlag> {
    return this.client
      .post('/feature-flags', flag)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }

  updateFlag(flag: FFlag): Promise<FFlag> {
    return this.client
      .put(`/feature-flags/${flag.featureFlagId}`, flag)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }

  deleteFlag(flag: FFlag): Promise<void> {
    return this.client
      .delete(`/feature-flags/${flag.featureFlagId}`)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }

  getFlag(id: number): Promise<SingleFFlag> {
    return this.client
      .get(`/feature-flags/${id}`)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }
}
