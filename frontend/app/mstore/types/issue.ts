const ISSUE_MAP: any = {
  dead_click: { name: 'Dead Click', icon: 'funnel/emoji-dizzy-fill', color: '#9C001F' },
  rage_click: { name: 'Rage Click', icon: 'funnel/emoji-angry-fill', color: '#CC0000' },
  click_rage: { name: 'Click Rage', icon: 'funnel/emoji-angry-fill', color: '#CC0000' },
  excessive_scrolling: { name: 'Excessive Scrolling', icon: 'funnel/mouse', color: '#D3545F' },
  bad_request: { name: 'Bad Request', icon: 'funnel/patch-exclamation-fill', color: '#D70072' },
  missing_resource: { name: 'Missing Resource', icon: 'funnel/image-fill', color: '#B89C50' },
  memory: { name: 'Memory', icon: 'funnel/cpu-fill', color: '#8A5A83' },
  cpu: { name: 'CPU', icon: 'funnel/hdd-fill', color: '#8A5A83' },
  slow_resource: { name: 'Slow Resource', icon: 'funnel/hourglass-top', color: '#8B006D' },
  slow_page_load: { name: 'Slow Page Load', icon: 'funnel/hourglass-top', color: '#8B006D' },
  custom_event_error: { name: 'Custom Event Error', icon: 'funnel/exclamation-circle-fill', color: '#BF6C00' },
  custom: { name: 'Custom', icon: 'funnel/exclamation-circle-fill', color: '#BF6C00' },
  crash: { name: 'Crash', icon: 'funnel/file-x', color: '#BF2D00' },
  js_exception: { name: 'JS Exception', icon: 'funnel/exclamation-circle', color: '#BF2D00' },
  mouse_thrashing: { name: 'Mouse Thrashing', icon: 'event/mouse_thrashing', color: '#D3545F' },
};

export default class Issue {
  type: string = '';
  name: string = '';
  sessionCount: number = 0;
  icon: string = '';
  source: string = '';
  color: string = '';

  constructor() {
    this.type = '';
    this.name = '';
    this.sessionCount = 0;
    this.icon = '';
    this.source = '';
    this.color = '';
  }

  fromJSON(json: any) {
    this.type = json.name;
    this.name = ISSUE_MAP[json.name].name || '';
    this.sessionCount = json.sessionCount;
    this.icon = ISSUE_MAP[json.name].icon || '';
    this.source = json.value || json.source || '';
    this.color = ISSUE_MAP[json.name].color || '';
    return this;
  }
}