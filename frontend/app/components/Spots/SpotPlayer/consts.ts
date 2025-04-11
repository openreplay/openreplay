export const TABS = {
  COMMENTS: 'comments',
  ACTIVITY: 'activity',
} as const;

export type Tab = (typeof TABS)[keyof typeof TABS];
