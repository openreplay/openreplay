import { makeAutoObservable } from 'mobx';
import { filterService } from 'App/services';

interface TopValue {
  rowCount?: number;
  rowPercentage?: number;
  value?: string;
}

interface TopValues {
  [key: string]: TopValue[];
}

export default class FilterStore {
  topValues: TopValues = {};

  constructor() {
    makeAutoObservable(this);
  }

  setTopValues = (key: string, values: Record<string, any> | TopValue[]) => {
    const vals = Array.isArray(values) ? values : values.data;
    this.topValues[key] = vals?.filter(
      (value) => value !== null && value.value !== '',
    );
  };

  resetValues = () => {
    this.topValues = {};
  };

  fetchTopValues = async (key: string, siteId: string, source?: string) => {
    const valKey = `${siteId}_${key}${source || ''}`
    if (this.topValues[valKey] && this.topValues[valKey].length) {
      return Promise.resolve(this.topValues[valKey]);
    }
    return filterService.fetchTopValues(key, source).then((response: []) => {
      this.setTopValues(valKey, response);
    });
  };
}
