import {
  CUSTOM_RANGE,
  DATE_RANGE_VALUES,
  getDateRangeFromValue,
} from 'App/dateRange';
import Filter, { IFilter } from 'App/mstore/types/filter';
import FilterItem from 'App/mstore/types/filterItem';
import { makeAutoObservable, observable } from 'mobx';
import { LAST_24_HOURS, LAST_30_DAYS, LAST_7_DAYS } from 'Types/app/period';
import { roundToNextMinutes } from '@/utils';

// @ts-ignore
const rangeValue = DATE_RANGE_VALUES.LAST_24_HOURS;
const range: any = getDateRangeFromValue(rangeValue);
const startDate = range.start.ts;
const endDate = range.end.ts;

interface ISearch {
  name: string;
  searchId?: number;
  referrer?: string;
  userBrowser?: string;
  userOs?: string;
  userCountry?: string;
  userDevice?: string;
  fid0?: string;
  events: Event[];
  filters: IFilter[];
  minDuration?: number;
  maxDuration?: number;
  custom: Record<string, any>;
  rangeValue: string;
  startDate: number;
  endDate: number;
  groupByUser: boolean;
  sort: string;
  order: string;
  viewed?: boolean;
  consoleLogCount?: number;
  eventsCount?: number;
  suspicious?: boolean;
  consoleLevel?: string;
  strict: boolean;
  eventsOrder: string;
}

export default class Search {
  name: string;

  searchId?: number;

  referrer?: string;

  userBrowser?: string;

  userOs?: string;

  userCountry?: string;

  userDevice?: string;

  fid0?: string;

  events: Event[];

  filters: FilterItem[];

  minDuration?: number;

  maxDuration?: number;

  custom: Record<string, any>;

  rangeValue: string;

  startDate: number;

  endDate: number;

  groupByUser: boolean;

  sort: string;

  order: string;

  viewed?: boolean;

  consoleLogCount?: number;

  eventsCount?: number;

  suspicious?: boolean;

  consoleLevel?: string;

  strict: boolean;

  eventsOrder: string;

  limit: number;

  constructor(initialData?: Partial<ISearch>) {
    makeAutoObservable(this, {
      filters: observable,
    });
    Object.assign(this, {
      name: '',
      searchId: undefined,
      referrer: undefined,
      userBrowser: undefined,
      userOs: undefined,
      userCountry: undefined,
      userDevice: undefined,
      fid0: undefined,
      events: [],
      filters: [],
      minDuration: undefined,
      maxDuration: undefined,
      custom: {},
      rangeValue,
      startDate,
      endDate,
      groupByUser: false,
      sort: 'startTs',
      order: 'desc',
      viewed: undefined,
      consoleLogCount: undefined,
      eventsCount: undefined,
      suspicious: undefined,
      consoleLevel: undefined,
      strict: false,
      eventsOrder: 'then',
      limit: 10,
      ...initialData,
    });
  }

  exists() {
    return Boolean(this.searchId);
  }

  toSaveData() {
    const js: any = { ...this };
    js.filters = js.filters.map((filter: any) => {
      filter.type = filter.key;
      delete filter.category;
      delete filter.icon;
      delete filter.operatorOptions;
      delete filter._key;
      delete filter.key;
      return filter;
    });

    delete js.createdAt;
    delete js.key;
    delete js._key;
    return js;
  }

  toData() {
    const js: any = { ...this };
    // js.filters = this.filters.map((filter: any) => {
    //   return new FilterItem().fromJson(filter).toJson();
    // });

    delete js.createdAt;
    delete js.key;
    return js;
  }

  toSearch() {
    const js: any = { ...this };
    js.filters = this.filters.map((filter: any) =>
      new FilterItem(filter).toJson(),
    );

    const { startDate, endDate } = this.getDateRange(
      js.rangeValue,
      js.startDate,
      js.endDate,
      15,
    );
    js.startDate = startDate;
    js.endDate = endDate;

    delete js.createdAt;
    delete js.key;
    return js;
  }

  private getDateRange(
    rangeName: string,
    customStartDate: number,
    customEndDate: number,
    roundMinutes?: number,
  ): { startDate: number; endDate: number } {
    let endDate = new Date().getTime();
    let startDate: number;
    const minutes = roundMinutes || 15;

    switch (rangeName) {
      case LAST_7_DAYS:
        startDate = endDate - 7 * 24 * 60 * 60 * 1000;
        break;
      case LAST_30_DAYS:
        startDate = endDate - 30 * 24 * 60 * 60 * 1000;
        break;
      case CUSTOM_RANGE:
        if (!customStartDate || !customEndDate) {
          throw new Error('Start date and end date must be provided for CUSTOM_RANGE.');
        }
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      case LAST_24_HOURS:
      default:
        startDate = endDate - 24 * 60 * 60 * 1000;
    }

    if (rangeName !== CUSTOM_RANGE) {
      startDate = roundToNextMinutes(startDate, minutes);
      endDate = roundToNextMinutes(endDate, minutes);
    }

    return { startDate, endDate };
  }

  fromJS({ eventsOrder, filters, events, custom, ...filterData }: any) {
    let startDate;
    let endDate;
    const rValue = filterData.rangeValue || rangeValue;

    if (rValue !== CUSTOM_RANGE) {
      const range: any = getDateRangeFromValue(rValue);
      startDate = range.start.ts;
      endDate = range.end.ts;
    } else if (filterData.startDate && filterData.endDate) {
      startDate = filterData.startDate;
      endDate = filterData.endDate;
    }

    return new Search({
      ...filterData,
      eventsOrder,
      startDate,
      endDate,
      // events: events.map((event: any) => new Event(event)),
      filters: filters.map((i: any) => {
        const filter = new Filter(i).toData();
        if (Array.isArray(i.filters)) {
          filter.filters = i.filters.map((f: any) =>
            new Filter({ ...f, subFilter: i.type }).toData(),
          );
        }
        return filter;
      }),
    });
  }
}
