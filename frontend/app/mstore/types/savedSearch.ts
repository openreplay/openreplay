import { notEmptyString } from 'App/validate';
import FilterItem from 'App/mstore/types/filterItem';
import Filter from './filter';

interface FilterType {
  filters: FilterItem[];
}

export interface SavedSearchData {
  filters: FilterItem[];
  startTimestamp?: number;
  endTimestamp?: number;
  sort?: string;
  order?: string;
  eventsOrder?: string;
  limit?: number;
  page?: number;
}

export interface ISavedSearch {
  searchId?: string;
  projectId?: number;
  userId?: number;
  userName?: string;
  name?: string;
  isPublic: boolean;
  isShare: boolean;
  data?: SavedSearchData;
  // Legacy support - will be mapped to data
  filter?: FilterType;
  createdAt?: string;
  count?: number;
  toData(): any;
  exists(): boolean;
}

class SavedSearch implements ISavedSearch {
  searchId?: string;
  projectId?: number;
  userId?: number;
  userName?: string;
  name?: string;
  isPublic: boolean;
  isShare: boolean;
  data?: SavedSearchData;
  // Legacy support
  filter?: FilterType;
  createdAt?: string;
  count?: number;

  constructor({
    searchId,
    projectId,
    userId,
    userName,
    name,
    isPublic = false,
    isShare = false,
    data,
    filter,
    createdAt,
    count = 0,
  }: Partial<ISavedSearch> = {}) {
    this.searchId = searchId;
    this.projectId = projectId;
    this.userId = userId;
    this.userName = userName;
    this.name = name;
    this.isPublic = isPublic;
    this.isShare = isShare;
    
    // Handle both new (data) and legacy (filter) structure
    if (data) {
      this.data = data;
      this.filter = { filters: data.filters || [] };
    } else if (filter) {
      this.filter = filter;
      this.data = {
        filters: filter.filters || [],
      };
    } else {
      this.filter = new Filter();
      this.data = {
        filters: [],
      };
    }
    
    this.createdAt = createdAt;
    this.count = count;
  }

  exists(): boolean {
    return !!this.searchId;
  }

  validate(): boolean {
    return notEmptyString(this.name);
  }

  toData() {
    const js: any = { ...this };
    if (js.filter) {
      js.filter.filters = js.filter.filters.map((f: any) => ({
        ...f,
        value: Array.isArray(f.value) ? f.value : [f.value],
      }));
    }
    if (js.data) {
      js.data.filters = js.data.filters.map((f: any) => ({
        ...f,
        value: Array.isArray(f.value) ? f.value : [f.value],
      }));
    }
    return js;
  }

  static fromJS(data: Partial<ISavedSearch>): SavedSearch {
    return new SavedSearch({
      ...data,
      filter: data.filter ? new Filter().fromJson(data.filter) : undefined,
    });
  }
}

export default SavedSearch;
