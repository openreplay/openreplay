import { makeAutoObservable } from 'mobx';
import { filters } from 'Types/filter/newFilter';
import { filterService } from 'App/services';

interface TopValue {
  rowCount: number;
  rowPercentage: number;
  value: string;
}

interface TopValues {
  [key: string]: TopValue[];
}

export default class FilterStore {
  topValues: TopValues = {};

  constructor() {
    makeAutoObservable(this);

    filters.forEach((filter) => {
      this.topValues[filter.key] = [];
    });
  }

  setTopValues = (key: string, values: TopValue[]) => {
    this.topValues[key] = values.filter((value) => value !== null && value.value !== '');
  };

  getTopValues = async (key: string) => {
    if (!this.topValues[key] || this.topValues[key].length === 0) {
      await this.fetchTopValues(key);
    }
    return Promise.resolve(this.topValues[key]);
  };

  fetchTopValues = async (key: string) => {
    return filterService.fetchTopValues(key).then((response: TopValue[]) => {
      this.setTopValues(key, response);
    });
  };
}
