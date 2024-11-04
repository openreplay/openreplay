export const MINUTES = [
  { value: 5, label: '5 Minutes' },
  { value: 15, label: '15 Minutes' },
  { value: 30, label: '30 Minutes' },
  { value: 60, label: '60 Minutes' },
];

export const HOURS = [ ...Array(24).keys() ].map(i => ({ value: i, label: `${ i > 9 ? '' : '0' }${ i }:00` }));

export const DAYS = [
  { value: -2, label: 'Every', },
  { value: -1, label: 'Everyday', },
  { value: 6, label: 'Sunday', },
  { value: 0, label: 'Monday', },
  { value: 1, label: 'Tuesday', },
  { value: 2, label: 'Wednesday', },
  { value: 3, label: 'Thursday', },
  { value: 4, label: 'Friday', },
  { value: 5, label: 'Saturday', },
];

export const EMAIL = 'email';
export const SLACK = 'slack';
export const TEAMS = 'msteams';
export const WEBHOOK = 'webhook';

export const CHANNEL = [
  { value: EMAIL, label: 'Email' },
  { value: SLACK, label: 'Slack' },
  { value: WEBHOOK, label: 'Webhook' },
]
