import Record from 'Types/Record';
import { List } from 'immutable';
import Watchdog from 'Types/watchdog'

export const issues_types = List([
  { 'type': 'all', 'visible': true, 'order': 0, 'name': 'All', 'icon': '' },
  { 'type': 'js_exception', 'visible': true, 'order': 1, 'name': 'Errors', 'icon': 'funnel/exclamation-circle' },
  { 'type': 'click_rage', 'visible': true, 'order': 2, 'name': 'Click Rage', 'icon': 'funnel/emoji-angry' },
  { 'type': 'crash', 'visible': true, 'order': 3, 'name': 'Crashes', 'icon': 'funnel/file-earmark-break' },
  { 'type': 'memory', 'visible': true, 'order': 4, 'name': 'High Memory', 'icon': 'funnel/sd-card' },
  // { 'type': 'vault', 'visible': true, 'order': 5, 'name': 'Vault', 'icon': 'safe' },
  // { 'type': 'bookmark', 'visible': true, 'order': 5, 'name': 'Bookmarks', 'icon': 'safe' },
  // { 'type': 'bad_request', 'visible': true, 'order': 1, 'name': 'Bad Requests', 'icon': 'funnel/file-medical-alt' },
  // { 'type': 'missing_resource', 'visible': true, 'order': 2, 'name': 'Missing Images', 'icon': 'funnel/image' },
  // { 'type': 'dead_click', 'visible': true, 'order': 4, 'name': 'Dead Clicks', 'icon': 'funnel/dizzy' },
  // { 'type': 'cpu', 'visible': true, 'order': 6, 'name': 'High CPU', 'icon': 'funnel/cpu' },
  // { 'type': 'custom', 'visible': false, 'order': 8, 'name': 'Custom', 'icon': 'funnel/exclamation-circle' }
]).map(Watchdog)

export const issues_types_map = {}
issues_types.forEach(i => {
  issues_types_map[i.type] = { type: i.type, visible: i.visible, order: i.order, name: i.name,  }
});

export default Record({
  issueId: undefined,
  name: '',
  visible: true,
  sessionId: undefined,
  time: undefined,
  seqIndex: undefined,
  payload: {},
  projectId: undefined,
  type: '',
  contextString: '',
  context: '',
  icon: 'info'
}, {
  idKey: 'issueId',
  fromJS: ({ type, ...rest }) => ({
    ...rest,
    type,
    icon: issues_types_map[type]?.icon,
    name: issues_types_map[type]?.name,
  }),
});
