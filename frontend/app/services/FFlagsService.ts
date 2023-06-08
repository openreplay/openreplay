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
}

export interface FFlag extends SimpleFlag {
  featureFlagId: number;
  isActive: boolea;
  createdAt: number;
  updatedAt: number;
  createdBy: number;
  updatedBy: number;
  conditions: never;
}

export interface SingleFFlag extends FFlag {
  conditions: FFlagCondition[];
}

export default class FFlagsService extends BaseService {
  fetchFlags(): Promise<{ records: FFlag[]; total: number }> {
    return this.client
      .get('/feature_flags')
      .then((r) => r.json())
      .then((j) => j.data || []);
  }

  createFlag(flag: SimpleFlag): Promise<FFlag> {
    return this.client
      .post('/feature_flags', flag)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }

  updateFlag(flag: FFlag): Promise<FFlag> {
    return this.client
      .put(`/feature_flags/${flag.featureFlagId}`, flag)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }

  deleteFlag(flag: FFlag): Promise<void> {
    return this.client
      .delete(`/feature_flags/${flag.featureFlagId}`)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }

  getFlag(id: number): Promise<SingleFFlag> {
    return this.client
      .get(`/feature_flags/${id}`)
      .then((r) => r.json())
      .then((j) => j.data || {});
  }
}
