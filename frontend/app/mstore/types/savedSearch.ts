import { notEmptyString } from 'App/validate';
import FilterItem from 'App/mstore/types/filterItem';
import Filter from './filter';

interface FilterType {
  filters: FilterItem[];
}

export interface ISavedSearch {
  searchId?: string;
  projectId?: string;
  userId?: string;
  name: string;
  filter: FilterType;
  createdAt?: string;
  count: number;
  isPublic: boolean;
  toData(): any;
  exists(): boolean;
}

class SavedSearch implements ISavedSearch {
  searchId?: string;

  projectId?: string;

  userId?: string;

  name: string;

  filter: FilterType;

  createdAt?: string;

  count: number;

  isPublic: boolean;

  constructor({
    searchId,
    projectId,
    userId,
    name = '',
    filter = new Filter(),
    createdAt,
    count = 0,
    isPublic = false,
  }: Partial<ISavedSearch> = {}) {
    this.searchId = searchId;
    this.projectId = projectId;
    this.userId = userId;
    this.name = name;
    this.filter = filter;
    this.createdAt = createdAt;
    this.count = count;
    this.isPublic = isPublic;
  }

  exists(): boolean {
    return !!this.searchId;
  }

  validate(): boolean {
    return notEmptyString(this.name);
  }

  toData() {
    const js = { ...this };
    js.filter.filters = js.filter.filters.map((f) => ({
      ...f,
      value: Array.isArray(f.value) ? f.value : [f.value],
    }));
    return js;
  }

  static fromJS(data: Partial<ISavedSearch>): SavedSearch {
    return new SavedSearch({
      ...data,
      filter: new Filter().fromJson(data.filter),
    });
  }
}

export default SavedSearch;
