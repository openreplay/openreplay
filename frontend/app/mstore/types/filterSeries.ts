import { makeAutoObservable, observable, action } from 'mobx';
import FilterStore from './filter';
import { JsonData } from '@/mstore/types/filterConstants';

export default class FilterSeries {
  public static get ID_KEY(): string {
    return 'seriesId';
  }

  seriesId?: any = undefined;
  name: string = 'Series 1';
  filter: FilterStore = new FilterStore();

  constructor() {
    makeAutoObservable(this, {
      name: observable,
      filter: observable.shallow,

      update: action
    });
  }

  update(key: any, value: any) {
    // @ts-ignore
    this[key] = value;
  }

  fromJson(json: JsonData, isHeatmap = false) {
    this.seriesId = json.seriesId;
    this.name = json.name;
    this.filter = new FilterStore().fromJson(
      json.filter || { filters: [] },
      isHeatmap
    );
    return this;
  }

  fromData(data: any) {
    this.seriesId = data.seriesId;
    this.name = data.name;
    this.filter = new FilterStore().fromData(data.filter);
    return this;
  }

  toJson() {
    return {
      seriesId: this.seriesId,
      name: this.name,
      filter: this.filter.toJson()
    };
  }
}
