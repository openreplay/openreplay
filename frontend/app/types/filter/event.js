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
  ERROR
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
  if (type === TYPES.CUSTOM) {
    if (!source) return 'Custom';
		return source;
  }
  return '?';
}

export default Record({
  timestamp: 0,
  key: '',
  label: '',
  operator: 'on',
  type: '',
  searchType: '',
  value: '',
  custom: '',
  inputValue: '',
  target: Target(),
  level: '',
  source: null,
  icon: '',
}, {
  keyKey: "_key",
  fromJS: ({ target, type = "" , ...event }) => {
    const viewType = type.split('_')[0];
    return {
      ...event,
      type: viewType,
      searchType: event.searchType || type,
      label: getLabelText(viewType, event.source),
      target: Target(target),
      operator: event.operator || defaultOperator(event),
      // value: target ? target.label : event.value,
      icon: event.icon || getEventIcon({...event, type: viewType })
    };
  }
})
