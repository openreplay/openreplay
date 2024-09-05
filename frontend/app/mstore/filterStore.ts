import { makeAutoObservable } from 'mobx';
import { filters } from 'Types/filter/newFilter';
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

  setTopValues = (key: string, values: TopValue[]) => {
    this.topValues[key] = values.filter((value) => value !== null && value.value !== '');
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
