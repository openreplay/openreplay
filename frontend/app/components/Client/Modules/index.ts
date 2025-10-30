import { TFunction } from 'i18next';
import extraModules, { MODULES } from './extra';
export * from './extra';

export { default } from './Modules';


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
  ...extraModules(t),
];
