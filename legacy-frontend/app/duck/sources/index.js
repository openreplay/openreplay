import { fromJS, Map, List } from 'immutable';
import listSourceCreator, { getAction } from './listSourceCreator';


const filtersFromJS = data => fromJS(data)
  .update('USERDEVICE', list => list.filter(value => value !== ""))
  .update('FID0', list => list.filter(value => value !== ""))

export default {
  values: listSourceCreator('values', '/events/values', ({ value }) => value),
  selectors: listSourceCreator('selectors', '/events/selectors', ({ targetSelector }) => targetSelector),
  filterValues: listSourceCreator('filterValues', '/sessions/filters', filtersFromJS, true, Map({
    USEROS: List(),
    USERBROWSER: List(),
    USERDEVICE: List(),
    FID0: List(),
    REFERRER: List(),
    USERCOUNTRY: List(),
  })),
};

export function fetch(name, params) {
  return getAction(name, params);
}
