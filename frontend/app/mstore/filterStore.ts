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

  fetchTopValues = async (key: string, source?: string) => {
    if (this.topValues.hasOwnProperty(key)) {
      return Promise.resolve(this.topValues[key]);
    }
    return filterService.fetchTopValues(key, source).then((response: []) => {
      this.setTopValues(`${key}${source || ''}`, response);
    });
  };
}
