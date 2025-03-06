// import Filter from 'Types/filter';
import { makeAutoObservable, observable, action } from 'mobx';
import Filter from './filter';

export default class FilterSeries {
  public static get ID_KEY(): string {
    return 'seriesId';
  }

  seriesId?: any = undefined;

  name: string = 'Series 1';

  filter: Filter = new Filter();

  constructor() {
    makeAutoObservable(this, {
      name: observable,
      filter: observable,

      update: action,
    });
  }

  update(key, value) {
    this[key] = value;
  }

  fromJson(json, isHeatmap = false) {
    this.seriesId = json.seriesId;
    this.name = json.name;
    this.filter = new Filter().fromJson(
      json.filter || { filters: [] },
      isHeatmap,
    );
    return this;
  }

  fromData(data) {
    this.seriesId = data.seriesId;
    this.name = data.name;
    this.filter = new Filter().fromData(data.filter);
    return this;
  }

  toJson() {
    return {
      seriesId: this.seriesId,
      name: this.name,
      filter: this.filter.toJson(),
    };
  }
}
