export const TimeMode = {
  Real: 'real',
  UserReal: 'user_real',
  Timestamp: 'current',
} as const;
export type ITimeMode = (typeof TimeMode)[keyof typeof TimeMode];
