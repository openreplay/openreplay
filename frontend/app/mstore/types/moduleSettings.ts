import { makeAutoObservable, runInAction } from 'mobx';

const enum MODULE {
  ASSIST = 'assist',
  NOTES = 'notes',
  BUG_REPORTS = 'bug-reports',
  OFFLINE_RECORDINGS = 'offline-recordings',
  ALERTS = 'alerts',
}

export const modules = [
  {
    label: 'Assist',
    description: 'Record and replay user sessions to see a video of what users did on your website.',
    key: MODULE.ASSIST,
    icon: 'broadcast'
  },
  {
    label: 'Notes',
    description: 'Add notes to sessions and recordings to share with your team.',
    key: MODULE.NOTES,
    icon: 'stickies',
    isEnabled: true
  },
  {
    label: 'Bug Reports',
    description: 'Allow users to report bugs and issues on your website.',
    key: MODULE.BUG_REPORTS,
    icon: 'filetype-pdf'
  },
  {
    label: 'Offline Recordings',
    description: 'Record user sessions even when they are offline.',
    key: MODULE.OFFLINE_RECORDINGS,
    icon: 'record2'
  },
  {
    label: 'Alerts',
    description: 'Get notified when users encounter errors on your website.',
    key: MODULE.ALERTS,
    icon: 'bell'
  }
];

export default class ModuleSettings {
  assist: boolean = false;
  notes: boolean = false;
  bugReports: boolean = false;
  offlineRecordings: boolean = false;
  alerts: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  setModuleSettings = (settings: any) => {
    this.assist = settings[MODULE.ASSIST];
    this.notes = settings[MODULE.NOTES];
    this.bugReports = settings[MODULE.BUG_REPORTS];
    this.offlineRecordings = settings[MODULE.OFFLINE_RECORDINGS];
    this.alerts = settings[MODULE.ALERTS];
  }

  updateKey = (key: string, value: any) => {
    runInAction(() => {
      this[key] = value;
    });
  }


}