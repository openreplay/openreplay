import { TFunction } from 'i18next';

export { default } from './Modules';

export const enum MODULES {
  ASSIST = 'assist',
  HIGHLIGHTS = 'notes',
  BUG_REPORTS = 'bug-reports',
  OFFLINE_RECORDINGS = 'offline-recordings',
  ALERTS = 'alerts',
  ASSIST_STATS = 'assist-stats',
  FEATURE_FLAGS = 'feature-flags',
  RECOMMENDATIONS = 'recommendations',
  USABILITY_TESTS = 'usability-tests',
}

export interface Module {
  label: string;
  description: string;
  key: string;
  icon?: string;
  isEnabled?: boolean;
  hidden?: boolean;
  enterprise?: boolean;
}

export const modules = (t: TFunction) => [
  {
    label: t('Co-Browse'),
    description: t(
      'Enable live session replay, remote control, annotations and webRTC call/video.',
    ),
    key: MODULES.ASSIST,
    icon: 'broadcast',
  },
  {
    label: t('Recordings'),
    description: t(
      'Record live sessions while co-browsing with users and share it with your team for training purposes.',
    ),
    key: MODULES.OFFLINE_RECORDINGS,
    icon: 'record2',
  },
  {
    label: t('Cobrowsing Reports'),
    description: t(
      'Keep an eye on cobrowsing metrics across your team and generate reports.',
    ),
    key: MODULES.ASSIST_STATS,
    icon: 'file-bar-graph',
    enterprise: true,
  },
  {
    label: t('Highlights'),
    description: t('Add highlights to sessions and share with your team.'),
    key: MODULES.HIGHLIGHTS,
    icon: 'chat-square-quote',
    isEnabled: true,
  },
  {
    label: t('Alerts'),
    description: t(
      'Create alerts on cards and get notified when a metric hits a certain threshold.',
    ),
    key: MODULES.ALERTS,
    icon: 'bell',
  },
  {
    label: t('Feature Flags'),
    description: t(
      'Make gradual releases and A/B test all of your new features without redeploying your app.',
    ),
    key: MODULES.FEATURE_FLAGS,
    icon: 'toggles',
  },
  {
    label: t('Recommendations'),
    description: t(
      'Get personalized recommendations for sessions to watch, based on your replay history and search preferences.',
    ),
    key: MODULES.RECOMMENDATIONS,
    icon: 'magic',
    hidden: true,
  },
  {
    label: t('Usability Tests'),
    description: t(
      'Get feedback from your users by creating usability tests and sharing them with your team.',
    ),
    key: MODULES.USABILITY_TESTS,
    icon: 'clipboard-check',
  },
];
