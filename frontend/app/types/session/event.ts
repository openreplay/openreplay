const CONSOLE = 'CONSOLE';
const CLICK = 'CLICK';
const INPUT = 'INPUT';
const LOCATION = 'LOCATION';
const CUSTOM = 'CUSTOM';
const CLICKRAGE = 'CLICKRAGE';
const IOS_VIEW = 'VIEW';
export const TYPES = { CONSOLE, CLICK, INPUT, LOCATION, CUSTOM, CLICKRAGE, IOS_VIEW };

export type EventType =
  | typeof CONSOLE
  | typeof CLICK
  | typeof INPUT
  | typeof LOCATION
  | typeof CUSTOM
  | typeof CLICKRAGE;

interface IEvent {
  time: number;
  timestamp: number;
  type: EventType
  name: string;
  key: number;
  label: string;
  targetPath: string;
  tabId?: string;
  target: {
    path: string;
    label: string;
  };
}

interface ConsoleEvent extends IEvent {
  subtype: string;
  value: string;
}

interface ClickEvent extends IEvent {
  targetContent: string;
  count: number;
  hesitation: number;
}

interface InputEvent extends IEvent {
  value: string;
  hesitation: number;
  duration: number;
}

export interface LocationEvent extends IEvent {
  url: string;
  host: string;
  pageLoad: boolean;
  fcpTime: number;
  loadTime: number;
  domContentLoadedTime: number;
  domBuildingTime: number;
  speedIndex: number;
  visuallyComplete: number;
  timeToInteractive: number;
  referrer: string;
  firstContentfulPaintTime: number;
  firstPaintTime: number;
}

export type EventData = ConsoleEvent | ClickEvent | InputEvent | LocationEvent | IEvent;

class Event {
  key: IEvent['key'];
  time: IEvent['time'];
  label: IEvent['label'];
  target: IEvent['target'];
  tabId: IEvent['tabId'];

  constructor(event: IEvent) {
    Object.assign(this, {
      time: event.time,
      label: event.label,
      key: event.key,
      tabId: event.tabId,
      target: {
        path: event.target?.path || event.targetPath,
        label: event.target?.label,
      },
    });
  }
}

class Console extends Event {
  readonly type = CONSOLE;
  readonly name = 'Console';
  subtype: string;
  value: string;

  constructor(evt: ConsoleEvent) {
    super(evt);
    this.subtype = evt.subtype;
    this.value = evt.value;
  }
}

export class Click extends Event {
  readonly type: typeof CLICKRAGE | typeof CLICK = CLICK;
  readonly name = 'Click';
  targetContent = '';
  count: number;
  hesitation: number = 0;

  constructor(evt: ClickEvent, isClickRage?: boolean) {
    super(evt);
    this.targetContent = evt.targetContent;
    this.count = evt.count;
    this.hesitation = evt.hesitation;
    if (isClickRage) {
      this.type = CLICKRAGE;
    }
  }
}

class Input extends Event {
  readonly type = INPUT;
  readonly name = 'Input';
  readonly hesitation: number = 0;
  readonly duration: number = 0;

  value = '';

  constructor(evt: InputEvent) {
    super(evt);
    this.value = evt.value;
    this.hesitation = evt.hesitation;
    this.duration = evt.duration;
  }
}

export class Location extends Event {
  readonly name = 'Location';
  readonly type = LOCATION;
  url: LocationEvent['url'];
  host: LocationEvent['host'];
  fcpTime: LocationEvent['fcpTime'];
  loadTime: LocationEvent['loadTime'];
  domContentLoadedTime: LocationEvent['domContentLoadedTime'];
  domBuildingTime: LocationEvent['domBuildingTime'];
  speedIndex: LocationEvent['speedIndex'];
  visuallyComplete: LocationEvent['visuallyComplete'];
  timeToInteractive: LocationEvent['timeToInteractive'];
  referrer: LocationEvent['referrer'];

  constructor(evt: LocationEvent) {
    super(evt);
    Object.assign(this, {
      ...evt,
      fcpTime: evt.firstContentfulPaintTime || evt.firstPaintTime,
    });
  }
}

export type InjectedEvent = Console | Click | Input | Location;

export default function (event: EventData) {
  if (event.type && event.type === CONSOLE) {
    return new Console(event as ConsoleEvent);
  }
  if (event.type && event.type === CLICK) {
    return new Click(event as ClickEvent);
  }
  if (event.type && event.type === INPUT) {
    return new Input(event as InputEvent);
  }
  if (event.type && event.type === LOCATION) {
    return new Location(event as LocationEvent);
  }
  if (event.type && event.type === CLICKRAGE) {
    return new Click(event as ClickEvent, true);
  }
  // not used right now?
  // if (event.type === CUSTOM || !event.type) {
  //   return new Event(event)
  // }
  console.error(`Unknown event type: ${event.type}`);
}
