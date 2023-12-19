import Record from 'Types/Record';

export const types = {
  ALL: 'all',
  JS_EXCEPTION: 'js_exception',
  BAD_REQUEST: 'bad_request',
  CRASH: 'crash',
  CLICK_RAGE: 'click_rage',
  MOUSE_THRASHING: 'mouse_thrashing',
  TAP_RAGE: 'tap_rage',
  DEAD_CLICK: 'dead_click',
} as const

type TypeKeys = keyof typeof types
type TypeValues = typeof types[TypeKeys]

type IssueType = {
  [issueTypeKey in TypeValues]: { type: issueTypeKey; visible: boolean; order: number; name: string; icon: string };
};

export const issues_types = [
  { 'type': types.ALL, 'visible': true, 'order': 0, 'name': 'All', 'icon': '' },
  { 'type': types.JS_EXCEPTION, 'visible': true, 'order': 1, 'name': 'Errors', 'icon': 'funnel/exclamation-circle' },
  { 'type': types.BAD_REQUEST, 'visible': true, 'order': 2, 'name': 'Bad Requests', 'icon': 'funnel/file-medical-alt' },
  { 'type': types.CLICK_RAGE, 'visible': true, 'order': 3, 'name': 'Click Rage', 'icon': 'funnel/emoji-angry' },
  { 'type': types.TAP_RAGE, 'visible': true, 'order': 4, 'name': 'Tap Rage', 'icon': 'funnel/emoji-angry' },
  { 'type': types.CRASH, 'visible': true, 'order': 5, 'name': 'Crashes', 'icon': 'funnel/file-earmark-break' },
  { 'type': types.MOUSE_THRASHING, 'visible': true, 'order': 6, 'name': 'Mouse Thrashing', 'icon': 'cursor-trash' },
  // { 'type': 'memory', 'visible': true, 'order': 4, 'name': 'High Memory', 'icon': 'funnel/sd-card' },
  // { 'type': 'vault', 'visible': true, 'order': 5, 'name': 'Vault', 'icon': 'safe' },
  // { 'type': 'bookmark', 'visible': true, 'order': 5, 'name': 'Bookmarks', 'icon': 'safe' },
  // { 'type': 'bad_request', 'visible': true, 'order': 1, 'name': 'Bad Requests', 'icon': 'funnel/file-medical-alt' },
  // { 'type': 'missing_resource', 'visible': true, 'order': 2, 'name': 'Missing Images', 'icon': 'funnel/image' },
  // { 'type': 'dead_click', 'visible': true, 'order': 4, 'name': 'Dead Clicks', 'icon': 'funnel/dizzy' },
  // { 'type': 'cpu', 'visible': true, 'order': 6, 'name': 'High CPU', 'icon': 'funnel/cpu' },
  // { 'type': 'custom', 'visible': false, 'order': 8, 'name': 'Custom', 'icon': 'funnel/exclamation-circle' }
] as const

const issues_types_map = <IssueType>{}
issues_types.forEach((i) => {
  Object.assign(issues_types_map, {
    [i.type]: {
      type: i.type,
      visible: i.visible,
      order: i.order,
      name: i.name,
      icon: i.icon,
    }
  })
});

export interface IIssue {
  issueId: string
  name: string
  visible: boolean
  sessionId: string
  time: number
  payload: Record<string, any>
  projectId: string
  type: TypeValues
  contextString: string
  context: string
  icon: string
  timestamp: number
  startedAt: number
}

export default class Issue {
  issueId: IIssue["issueId"]
  name: IIssue["name"]
  visible: IIssue["visible"]
  sessionId: IIssue["sessionId"]
  time: IIssue["time"]
  payload: IIssue["payload"]
  projectId: IIssue["projectId"]
  type: IIssue["type"]
  contextString: IIssue["contextString"]
  context: IIssue["context"]
  icon: IIssue["icon"]
  key: number

  constructor({ type, ...rest }: IIssue & { key: number }) {
    Object.assign(this, {
      ...rest,
      type,
      icon: issues_types_map[type]?.icon,
      name: issues_types_map[type]?.name
    })
  }
}