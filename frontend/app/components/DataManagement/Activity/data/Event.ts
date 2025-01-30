interface DefaultFields {
  userId: string;
  userCity: string;
  userEnvironment: string;
}

export interface EventData {
  name: string;
  time: number;
  $_isAutoCapture: boolean;
  $_defaultFields: DefaultFields;
  $_customFields?: Record<string, any>;
}

export default class Event {
  name: string;
  time: number;
  defaultFields: DefaultFields = {
    userId: '',
    userLocation: '',
    userEnvironment: '',
  }
  customFields?: Record<string,any> = undefined;

  readonly $_isAutoCapture: boolean;
  readonly $_sessionId: string;

  constructor(
    {
      name,
      time,
      defaultFields,
      customFields,
      sessionId,
      isAutoCapture,
}: {
      name: string;
      time: number;
      defaultFields: DefaultFields;
      customFields?: Record<string, any>;
      sessionId: string;
      isAutoCapture: boolean;
    }) {
    this.name = name;
    this.time = time;
    this.defaultFields = defaultFields;
    this.customFields = customFields;
    this.$_isAutoCapture = isAutoCapture;
    this.$_sessionId = sessionId;
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
