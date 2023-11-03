export { default } from './Modules';

export const enum MODULES {
  ASSIST = 'assist',
  NOTES = 'notes',
  BUG_REPORTS = 'bug-reports',
  OFFLINE_RECORDINGS = 'offline-recordings',
  ALERTS = 'alerts',
  ASSIST_STATS = 'assist-stats',
  FEATURE_FLAGS = 'feature-flags',
  RECOMMENDATIONS = 'recommendations',
}

export interface Module {
  label: string;
  description: string;
  key: string;
  icon?: string;
  isEnabled?: boolean;
  hidden?: boolean;
}

export const modules = [
  {
    label: 'Cobrowse',
    description: 'Enable live session replay, remote control, annotations and webRTC call/video.',
    key: MODULES.ASSIST,
    icon: 'broadcast'
  },
  {
    label: 'Notes',
    description: 'Add notes to sessions and share with your team.',
    key: MODULES.NOTES,
    icon: 'stickies',
    isEnabled: true
  },
  {
    label: 'Bug Reports',
    description: 'Make PDF reports bugs and issues while replaying sessions.',
    key: MODULES.BUG_REPORTS,
    icon: 'filetype-pdf'
  },
  {
    label: 'Recordings',
    description: 'Record live sessions while co-browsing with users and share it with your team for training purposes.',
    key: MODULES.OFFLINE_RECORDINGS,
    icon: 'record2'
  },
  {
    label: 'Alerts',
    description: 'Create alerts on cards and get notified when a metric hits a certain threshold.',
    key: MODULES.ALERTS,
    icon: 'bell'
  },
  {
    label: 'Cobrowsing Reports',
    description: 'Get detailed analytics on your users and their sessions.',
    key: MODULES.ASSIST_STATS,
    icon: 'file-bar-graph'
  },
  {
    label: 'Feature Flags',
    description: 'Create feature flags and enable/disable them on the fly.',
    key: MODULES.FEATURE_FLAGS,
    icon: 'toggles'
  },
  {
    label: 'Recommendations',
    description: 'Recommendations based on user behavior.',
    key: MODULES.RECOMMENDATIONS,
    icon: 'magic',
    hidden: true
  },
];