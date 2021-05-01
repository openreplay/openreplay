export const MINUTES = [
  { value: 5, text: '5 Minutes' },
  { value: 15, text: '15 Minutes' },
  { value: 30, text: '30 Minutes' },
  { value: 60, text: '60 Minutes' },  
];

export const HOURS = [ ...Array(24).keys() ].map(i => ({ value: i, text: `${ i > 9 ? '' : '0' }${ i }:00` }));

export const DAYS = [
  {
    value: -2,
    text: 'Every',
  },
  {
    value: -1,
    text: 'Everyday',
  },
  {
    value: 6,
    text: 'Sunday',
  },
  {
    value: 0,
    text: 'Monday',
  },
  {
    value: 1,
    text: 'Tuesday',
  },
  {
    value: 2,
    text: 'Wednesday',
  },
  {
    value: 3,
    text: 'Thursday',
  },
  {
    value: 4,
    text: 'Friday',
  },
  {
    value: 5,
    text: 'Saturday',
  },
];

export const EMAIL = 'email';
export const SLACK = 'slack';
export const WEBHOOK = 'webhook';

export const CHANNEL = [
  {
    value: EMAIL,
    text: 'Email'
  },
  {
    value: SLACK,
    text: 'Slack'
  },
  {
    value: WEBHOOK,
    text: 'Webhook'
  }
]