import BaseService from 'App/services/BaseService';

type FFlagType = 'single' | 'multi';
type FFlagCondition = {
  name: string;
  rolloutPercentage: number;
  filters: any[];
};

export interface SimpleFlag {
  flagKey: string;
  description: string;
  flagType: FFlagType;
  isPersist: boolean;
  conditions: FFlagCondition[];
  payload?: string;
}

type Variant = {
  variantId?: number;
  value: string;
  description?: string;
  payload: string;
  rolloutPercentage: number;
};

export interface FFlag extends SimpleFlag {
  featureFlagId: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: number;
  updatedBy: number;
  conditions: never;
  variants: Variant[];
}

export interface SingleFFlag extends SimpleFlag {
  createdAt: number;
  updatedAt: number;
  createdBy: number;
  updatedBy: number;
  featureFlagId: number;
  isActive: boolean;
  variants: Variant[];
}

export default class FFlagsService extends BaseService {
  fetchFlags(
    filters: Record<string, any>,
  ): Promise<{ list: FFlag[]; total: number }> {
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

  updateStatus(flagId: number, isActive: boolean): Promise<void> {
    return this.client
      .post(`/feature-flags/${flagId}/status`, { isActive })
      .then((r) => r.json())
      .then((j) => j.data || {});
  }

  deleteFlag(id: number): Promise<void> {
    return this.client
      .delete(`/feature-flags/${id}`)
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
