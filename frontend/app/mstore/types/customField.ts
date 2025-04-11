import { makeAutoObservable, runInAction } from 'mobx';

const varRegExp = new RegExp('^[A-Za-z_-][A-Za-z0-9_-]*$');

export const BOOLEAN = 'boolean';
export const STRING = 'string';
export const NUMBER = 'number';
export const MAX_COUNT = 20;

interface CustomRecord {
  index?: string;
  key: string;
  label: string;
  type: string;
  validate: () => boolean;
  toData: () => any;
}

class CustomField implements CustomRecord {
  index: string = '';

  key: string = '';

  label: string = '';

  type: string = STRING;

  constructor(props: Partial<CustomRecord> = {}) {
    Object.assign(this, props);
    makeAutoObservable(this);
  }

  fromJson(json: any) {
    runInAction(() => {
      Object.assign(this, json);
    });
    return this;
  }

  exists(): boolean {
    return Boolean(this.index);
  }

  validate(): boolean {
    return varRegExp.test(this.key) && this.type !== '';
  }

  toData(): any {
    return {
      index: this.index,
      key: this.key,
      label: this.label,
      type: this.type,
    };
  }
}

export default CustomField;
