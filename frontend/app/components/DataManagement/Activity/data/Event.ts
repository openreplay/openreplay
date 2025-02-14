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
  eventId: string;
  displayName: string;
  description: string;
  monthVolume: number;
  monthQuery: number;
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
      displayName,
      description,
      monthVolume,
      monthQuery,
}: {
      name: string;
      time: number;
      defaultFields: DefaultFields;
      customFields?: Record<string, any>;
      sessionId: string;
      isAutoCapture: boolean;
      displayName: string;
      description: string;
      monthVolume: number;
      monthQuery: number;
    }) {
    this.name = name;
    this.eventId = 'asdasd';
    this.time = time;
    this.defaultFields = defaultFields;
    this.customFields = customFields;
    this.$_isAutoCapture = isAutoCapture;
    this.$_sessionId = sessionId;
    this.displayName = displayName;
    this.description = description;
    this.monthVolume = monthVolume;
    this.monthQuery = monthQuery;
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
      displayName: this.displayName,
      description: this.description,
      monthVolume: this.monthVolume,
      monthQuery: this.monthQuery,
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
