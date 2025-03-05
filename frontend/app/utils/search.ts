import Period, { CUSTOM_RANGE, LAST_24_HOURS } from 'Types/app/period';

const DEFAULT_SORT = 'startTs';
const DEFAULT_ORDER = 'desc';
const DEFAULT_EVENTS_ORDER = 'then';

class Filter {
  key: string;

  operator: string;

  value?: string[];

  filters?: Filter[];

  constructor(
    key: string,
    operator: string,
    value?: string[],
    filters?: Filter[],
  ) {
    this.key = key;
    this.operator = operator;
    this.value = value;
    this.filters = filters;
  }

  toJSON(): any {
    return {
      key: this.key,
      operator: this.operator,
      value: this.value,
      filters: this.filters ? this.filters.map((f) => f.toJSON()) : undefined,
    };
  }
}

export class InputJson {
  filters: Filter[];

  rangeValue: string;

  startDate?: number;

  endDate?: number;

  sort: string;

  order: string;

  eventsOrder: string;

  constructor(
    filters: Filter[],
    rangeValue: string,
    sort: string,
    order: string,
    eventsOrder: string,
    startDate?: string | number,
    endDate?: string | number,
  ) {
    this.filters = filters;
    this.rangeValue = rangeValue;
    this.startDate = startDate ? +startDate : undefined;
    this.endDate = endDate ? +endDate : undefined;
    this.sort = sort;
    this.order = order;
    this.eventsOrder = eventsOrder;
  }

  toJSON() {
    return {
      filters: this.filters.map((f) => f.toJSON()),
      rangeValue: this.rangeValue,
      startDate: this.startDate ?? null,
      endDate: this.endDate ?? null,
      sort: this.sort,
      order: this.order,
      eventsOrder: this.eventsOrder,
    };
  }

  fromJSON(json: Record<string, any>): InputJson {
    return new InputJson(
      json.filters.map(
        (f: any) => new Filter(f.key, f.operator, f.value, f.filters),
      ),
      json.rangeValue,
      json.sort,
      json.order,
      json.eventsOrder,
      json.startDate,
      json.endDate,
    );
  }
}

export class JsonUrlConverter {
  static keyMap = {
    rangeValue: 'rv',
    startDate: 'sd',
    endDate: 'ed',
    sort: 's',
    order: 'o',
    eventsOrder: 'eo',
    key: 'k',
    operator: 'op',
    value: 'v',
    filters: 'f',
  };

  static getDateRangeValues(
    rangeValue: string,
    startDate: string | null,
    endDate: string | null,
  ): [string, string] {
    if (rangeValue === CUSTOM_RANGE) {
      return [startDate || '', endDate || ''];
    }
    const period: any = Period({ rangeName: rangeValue });
    return [period.start, period.end];
  }

  static jsonToUrlParams(json: Record<string, any>): string {
    const params = new URLSearchParams();

    const addFilterParams = (filter: Filter, prefix: string) => {
      params.append(`${prefix}${this.keyMap.key}`, filter.key);
      params.append(`${prefix}${this.keyMap.operator}`, filter.operator);
      filter.value?.forEach((v, i) =>
        params.append(`${prefix}${this.keyMap.value}[${i}]`, v || ''),
      );
      filter.filters?.forEach((f, i) =>
        addFilterParams(f, `${prefix}${this.keyMap.filters}[${i}].`),
      );
    };

    json.filters.forEach((filter: any, index: number) =>
      addFilterParams(filter, `${this.keyMap.filters}[${index}].`),
    );

    params.append(this.keyMap.rangeValue, json.rangeValue);
    if (json.rangeValue === CUSTOM_RANGE) {
      const rangeValues = this.getDateRangeValues(
        json.rangeValue,
        json.startDate?.toString() || null,
        json.endDate?.toString() || null,
      );
      params.append(this.keyMap.startDate, rangeValues[0]);
      params.append(this.keyMap.endDate, rangeValues[1]);
    }
    params.append(this.keyMap.sort, json.sort);
    params.append(this.keyMap.order, json.order);
    params.append(this.keyMap.eventsOrder, json.eventsOrder);

    return decodeURIComponent(params.toString());
  }

  static urlParamsToJson(urlParams: string): InputJson {
    const params = new URLSearchParams(urlParams);

    const getFilterParams = (prefix: string): Filter => {
      const key = params.get(`${prefix}${this.keyMap.key}`) || '';
      const operator = params.get(`${prefix}${this.keyMap.operator}`) || '';
      const value: string[] = [];
      let index = 0;
      while (params.has(`${prefix}${this.keyMap.value}[${index}]`)) {
        value.push(params.get(`${prefix}${this.keyMap.value}[${index}]`) || '');
        index++;
      }
      const filters: Filter[] = [];
      index = 0;
      while (
        params.has(
          `${prefix}${this.keyMap.filters}[${index}].${this.keyMap.key}`,
        )
      ) {
        filters.push(
          getFilterParams(`${prefix}${this.keyMap.filters}[${index}].`),
        );
        index++;
      }
      return new Filter(
        key,
        operator,
        value.length ? value : [],
        filters.length ? filters : [],
      );
    };

    const filters: Filter[] = [];
    let index = 0;
    while (params.has(`${this.keyMap.filters}[${index}].${this.keyMap.key}`)) {
      filters.push(getFilterParams(`${this.keyMap.filters}[${index}].`));
      index++;
    }

    const rangeValue = params.get(this.keyMap.rangeValue) || LAST_24_HOURS;
    const rangeValues = this.getDateRangeValues(
      rangeValue,
      params.get(this.keyMap.startDate),
      params.get(this.keyMap.endDate),
    );

    return new InputJson(
      filters,
      rangeValue,
      params.get(this.keyMap.sort) || DEFAULT_SORT,
      params.get(this.keyMap.order) || DEFAULT_ORDER,
      params.get(this.keyMap.eventsOrder) || DEFAULT_EVENTS_ORDER,
      rangeValues[0],
      rangeValues[1],
    );
  }
}

// Example usage
// const urlParams = '?f[0].k=click&f[0].op=on&f[0].v[0]=Refresh&f[1].k=fetch&f[1].op=is&f[1].v[0]=&f[1].f[0].k=fetchUrl&f[1].f[0].op=is&f[1].f[0].v[0]=/g/collect&f[1].f[1].k=fetchStatusCode&f[1].f[1].op=>=&f[1].f[1].v[0]=400&f[1].f[2].k=fetchMethod&f[1].f[2].op=is&f[1].f[2].v[0]=&f[1].f[3].k=fetchDuration&f[1].f[3].op==&f[1].f[3].v[0]=&f[1].f[4].k=fetchRequestBody&f[1].f[4].op=is&f[1].f[4].v[0]=&f[1].f[5].k=fetchResponseBody&f[1].f[5].op=is&f[1].f[5].v[0]=&rv=LAST_24_HOURS&sd=1731343412555&ed=1731429812555&s=startTs&o=desc&st=false&eo=then';
// const parsedJson = JsonUrlConverter.urlParamsToJson(urlParams);
// console.log(parsedJson);

// const inputJson: any = {"filters":[{"key":"input","operator":"is","value":["one","two"],"filters":null},{"key":"fetch","operator":"is","filters":[{"key":"fetchUrl","operator":"is","value":["PATH","another"]},{"key":"fetchStatusCode","operator":"=","value":["400","200"]},{"key":"fetchMethod","operator":"is","value":["PUT","POST"]},{"key":"fetchDuration","operator":">=","value":["1"]},{"key":"fetchRequestBody","operator":"is","value":[null]},{"key":"fetchResponseBody","operator":"is","value":[null]}],"value":[""]}],"rangeValue":"LAST_24_HOURS","startDate":1720952011000,"endDate":1721038411000,"sort":"startTs","order":"desc","strict":false,"eventsOrder":"then"};
// const urlParams = JsonUrlConverter.jsonToUrlParams(inputJson);
// const parsedJson = JsonUrlConverter.urlParamsToJson(urlParams);
//
// console.log(urlParams);
// console.log(parsedJson);
