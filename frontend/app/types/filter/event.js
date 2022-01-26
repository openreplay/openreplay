import Record from 'Types/Record';
import Target from 'Types/target';
import { defaultOperator, getEventIcon } from 'Types/filter';

const CONSOLE = 'ERROR';
const FETCH = 'REQUEST';
const GRAPHQL = 'GRAPHQL';
const STATEACTION = 'STATEACTION';
const REVID = 'REVID';
const CLICK = 'CLICK';
const INPUT = 'INPUT';
const LOCATION = 'LOCATION';
const VIEW = 'VIEW';
const CUSTOM = 'CUSTOM';
const METADATA = 'METADATA';
const USERANONYMOUSID = 'USERANONYMOUSID';
const USERID = 'USERID';
const ERROR = 'ERROR';

const DOM_COMPLETE = 'DOM_COMPLETE';
const LARGEST_CONTENTFUL_PAINT_TIME = 'LARGEST_CONTENTFUL_PAINT_TIME';
const TIME_BETWEEN_EVENTS = 'TIME_BETWEEN_EVENTS';
const TTFB = 'TTFB';
const AVG_CPU_LOAD = 'AVG_CPU_LOAD';
const AVG_MEMORY_USAGE = 'AVG_MEMORY_USAGE';

export const TYPES = {
  CONSOLE,
  GRAPHQL,
  STATEACTION,
  FETCH,
  REVID,
  CLICK,
  INPUT,
  LOCATION,
  VIEW,
  CUSTOM,
  METADATA,
  USERANONYMOUSID,
  USERID,
  ERROR,
  
  DOM_COMPLETE,
  LARGEST_CONTENTFUL_PAINT_TIME,
  TIME_BETWEEN_EVENTS,
  TTFB,
  AVG_CPU_LOAD,
  AVG_MEMORY_USAGE,
};

function getLabelText(type, source) {
  if (type === TYPES.CLICK) return 'Click';
  if (type === TYPES.LOCATION) return 'Page';
  if (type === TYPES.VIEW) return 'View';
  if (type === TYPES.INPUT) return 'Input';
  // if (type === TYPES.CONSOLE) return 'Console';
  if (type === TYPES.METADATA) return 'Metadata';
  if (type === TYPES.GRAPHQL) return 'GraphQL';
  if (type === TYPES.STATEACTION) return 'Store Action';
  if (type === TYPES.FETCH) return 'Fetch';
  if (type === TYPES.REVID) return 'Rev ID';
  if (type === TYPES.ERROR) return 'Error';
  if (type === TYPES.USERID) return 'User Id';
  if (type === TYPES.USERANONYMOUSID) return 'User Anonymous Id';
  if (type === TYPES.REVID) return 'Rev ID';

  if (type === TYPES.DOM_COMPLETE) return 'DOM Complete';
  if (type === TYPES.LARGEST_CONTENTFUL_PAINT_TIME) return 'Largest Contentful Paint Time';
  if (type === TYPES.TIME_BETWEEN_EVENTS) return 'Time Between Events';
  if (type === TYPES.TTFB) return 'TTFB';
  if (type === TYPES.AVG_CPU_LOAD) return 'Avg CPU Load';
  if (type === TYPES.AVG_MEMORY_USAGE) return 'Avg Memory Usage';

  if (type === TYPES.CUSTOM) {
    if (!source) return 'Custom';
		return source;
  }
  return type;
}

export default Record({
  timestamp: 0,
  key: '',
  label: '',
  operator: 'on',
  type: '',
  searchType: '',
  value: [],
  custom: '',
  inputValue: '',
  target: Target(),
  level: '',
  source: null,
  icon: '',
}, {
  keyKey: "_key",
  fromJS: ({ target, type = "" , ...event }) => {
    // const viewType = type.split('_')[0];
    return {
      ...event,
      type: type,
      searchType: event.searchType || type,
      label: getLabelText(type, event.source),
      target: Target(target),
      operator: event.operator || defaultOperator(event),
      // value: target ? target.label : event.value,
      icon: event.icon || getEventIcon({...event, type: type })
    };
  }
})
