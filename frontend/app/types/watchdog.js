import Record from 'Types/Record';
import { Map } from 'immutable';


const 
  ERRORS = 'errors',
  BAD_REQUEST = 'bad_request',
  MISSING_IMAGE = 'missing_image',
  SLOW_SESSION = 'slow_session',
  HIGH_ENGAGEMENT = 'high_engagement',
  CLICKRAGE = 'clickrage',
  PERFORMANCE_ISSUES = 'performance_issues';

const WATCHDOG_TYPES = [
  ERRORS,
  BAD_REQUEST,
  MISSING_IMAGE,
  SLOW_SESSION,
  HIGH_ENGAGEMENT,
  CLICKRAGE,
  PERFORMANCE_ISSUES,
]

export const names = {
  'js_exception' : { label: 'JS Exceptions', icon: 'funnel/exclamation-circle' },
  'bad_request': { label: 'Bad Request', icon: 'funnel/patch-exclamation-fill' },
  'missing_resource': { label: 'Missing Resources', icon: 'funnel/image-fill' },
  'memory': { label: 'Memory', icon: 'funnel/cpu-fill' },
  'click_rage': { label: 'Click Rage', icon: 'funnel/emoji-angry-fill' },
  'slow_page_load': { label: 'Slow Page Load', icon: 'funnel/hourglass-top' },
  'crash': { label: 'Crashes', icon: 'funnel/file-x' },
  'cpu': { label: 'CPU', icon: 'funnel/hdd-fill' },
  'dead_click': { label: 'Dead Click', icon: 'funnel/emoji-dizzy-fill' },
  'custom': { label: 'Custom', icon: 'funnel/exclamation-circle-fill' },
}

const CONJUGATED_ISSUE_TYPES = {
  'errors': [ 'crash' ],
  'bad_request': [ 'bad_request'],
  'missing_image': [ 'missing_resource' ],
  'slow_session': [ 'slow_page_load', 'slow_resource', 'ml_slow_resources' ],
  'high_engagement': [],
  'clickrage': [ 'click_rage', 'ml_click_rage' ], // 'dead_click', 'excessive_scrolling', 'ml_dead_click', 'ml_mouse_thrashing', 'ml_excessive_scrolling'
  'crashes': [ 'crash' ],
  'performance_issues': [ 'memory', 'cpu', 'slow_resource', 'ml_cpu', 'ml_memory', 'ml_slow_resources' ],
}

export function getSessionWatchdogTypes(session) {
  if (!session.issueTypes) return session.errorsCount > 0 ? [ERRORS] : [];
  return WATCHDOG_TYPES.filter(wt => wt=== ERRORS && session.errorsCount> 0 || CONJUGATED_ISSUE_TYPES[wt].some(it => session.issueTypes.includes(it)));
}


export default Record({
  watchdogId: undefined,
  name: '',
  type: '',
  icon: 'info',
  ruleId: '',
  ruleConfig: {},
  enabled: undefined,
  projectId: undefined,
  payload: Map({ captureAll: false, rate: 0 }),
  visible: undefined
}, {
  idKey: 'watchdogId',
  methods: {
    validate() {
      return this.name !== '' && this.ruleId !== '';
    },
    exists() {
      return this.id !== undefined;
    },
    fits(session) {
      if (session.issueTypes && session.issueTypes.includes(this.type)) {
        return true;
      }
      if (session.errorsCount > 0 && this.type===ERRORS) {
        return true;
      }
      if (!!session.issueTypes && !!CONJUGATED_ISSUE_TYPES[this.type]) {
        return session.issueTypes.some(it => CONJUGATED_ISSUE_TYPES[this.type].includes(it));
      }
      return false;
    }
  },
  fromJS: (item) => ({ 
    ...item
  }),
});
