import Record from 'Types/Record';
import Target from 'Types/target';

const CONSOLE = 'CONSOLE';
const CLICK = 'CLICK';
const INPUT = 'INPUT';
const LOCATION = 'LOCATION';
const CUSTOM = 'CUSTOM';
const CLICKRAGE = 'CLICKRAGE';
const IOS_VIEW = 'VIEW';
export const TYPES = { CONSOLE, CLICK, INPUT, LOCATION, CUSTOM, CLICKRAGE, IOS_VIEW};


const Event = Record({
  time: 0,
  label: ''
}, {
  fromJS: event => ({
    ...event,
    target: Target(event.target || { path: event.targetPath }),
  })
})

const Console = Event.extend({
  type: CONSOLE,
  subtype: '', // level ???
  value: '',
},{
  name: 'Console'
})

const Click = Event.extend({
  type: CLICK,
  targetContent: '',
  target: Target(),
  count: undefined
}, {
  name: 'Click'
});

const Input = Event.extend({
  type: INPUT,
  target: Target(),
  value: '',
},{
  name: 'Input'
});

const View = Event.extend({
  type: IOS_VIEW,
  name: '',
},{
  name: 'View'
})

const Location = Event.extend({
  type: LOCATION,
  url: '',
  host: '',
  pageLoad: false,
  fcpTime: undefined,
  //fpTime: undefined,
  loadTime: undefined,
  domContentLoadedTime: undefined,
  domBuildingTime: undefined,
  speedIndex: undefined,
  visuallyComplete: undefined,
  timeToInteractive: undefined,
  referrer: '',
}, {
  fromJS: event => ({
    ...event,
    //fpTime: event.firstPaintTime,
    fcpTime: event.firstContentfulPaintTime || event.firstPaintTime,
  }),
  name: 'Location'
});

const TYPE_CONSTRUCTOR_MAP = {
  [CONSOLE]: Console,
  [CLICK]: Click,
  [INPUT]: Input,
  [LOCATION]: Location,
  [CLICKRAGE]: Click,
  [IOS_VIEW]: View,
}

export default function(event = {}) {
  return (TYPE_CONSTRUCTOR_MAP[event.type] || Event)(event);
}

