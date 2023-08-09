export { default } from './Modules';

export const enum MODULES {
  ASSIST = 'assist',
  NOTES = 'notes',
  BUG_REPORTS = 'bug-reports',
  OFFLINE_RECORDINGS = 'offline-recordings',
  ALERTS = 'alerts',
}

export interface Module {
  label: string;
  description: string;
  key: string;
  icon?: string;
  isEnabled?: boolean;
}

export const modules = [
  {
    label: 'Assist',
    description: 'Record and replay user sessions to see a video of what users did on your website.',
    key: MODULES.ASSIST,
    icon: 'broadcast'
  },
  {
    label: 'Notes',
    description: 'Add notes to sessions and recordings to share with your team.',
    key: MODULES.NOTES,
    icon: 'stickies',
    isEnabled: true
  },
  {
    label: 'Bug Reports',
    description: 'Allow users to report bugs and issues on your website.',
    key: MODULES.BUG_REPORTS,
    icon: 'filetype-pdf'
  },
  {
    label: 'Offline Recordings',
    description: 'Record user sessions even when they are offline.',
    key: MODULES.OFFLINE_RECORDINGS,
    icon: 'record2'
  },
  {
    label: 'Alerts',
    description: 'Get notified when users encounter errors on your website.',
    key: MODULES.ALERTS,
    icon: 'bell'
  }
];