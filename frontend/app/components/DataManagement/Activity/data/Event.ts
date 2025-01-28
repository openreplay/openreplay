interface DefaultFields {
  userId: string;
  userCity: string;
  userEnvironment: string;
}

export interface EventData {
  name: string;
  time: string;
  $_isAutoCapture: boolean;
  $_defaultFields: DefaultFields;
  $_customFields?: Record<string, any>;
}

export default class Event {
  name: string;
  time: string;
  defaultFields: DefaultFields = {
    userId: '',
    userCity: '',
    userEnvironment: '',
  }
  customFields?: Record<string,any> = undefined;

  readonly $_isAutoCapture;

  constructor(name: string, time: string, defaultFields: DefaultFields, customFields?: Record<string, any>, isAutoCapture = false) {
    this.name = name;
    this.time = time;
    this.defaultFields = defaultFields;
    this.customFields = customFields;
    this.$_isAutoCapture = isAutoCapture;
  }

  toJSON() {
    const obj = this.toData();
    return JSON.stringify(obj, 4);
  }

  toData(): EventData {
    const obj: any = {
      name: this.name,
      time: this.time,
      $_isAutoCapture: this.$_isAutoCapture,
      $_defaultFields: this.defaultFields,
      $_customFields: this.customFields,
    }
    Object.entries(this.defaultFields).forEach(([key, value]) => {
      obj[key] = value;
    });
    if (this.customFields) {
      Object.entries(this.customFields).forEach(([key, value]) => {
        obj[key] = value;
      });
    }
    return obj;
  }
}
