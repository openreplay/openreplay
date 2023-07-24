import React from 'react';

interface MenuItem {
  label: React.ReactNode;
  key: React.Key;
  icon?: string;
  children?: MenuItem[];
  route?: string;
}

interface Category {
  title: React.ReactNode;
  key: React.Key;
  items: MenuItem[];
}

export const categories: Category[] = [
  {
    title: 'Replays',
    key: 'replays',
    items: [
      { label: 'Sessions', key: 'sessions', icon: 'collection-play' },
      { label: 'Recommendations', key: 'recommendations', icon: 'magic' },
      { label: 'Vault', key: 'vault', icon: 'safe' },
      { label: 'Bookmarks', key: 'bookmarks', icon: 'safe' },
      { label: 'Notes', key: 'notes', icon: 'stickies' }
    ]
  },
  {
    title: 'Assist',
    key: 'assist',
    items: [
      { label: 'Live Sessions', key: 'live-sessions', icon: 'broadcast' },
      { label: 'Recordings', key: 'recordings', icon: 'record-btn' }
    ]
  },
  {
    title: 'Analytics',
    key: 'analytics',
    items: [
      { label: 'Dashboards', key: 'dashboards', icon: 'columns-gap' },
      {
        label: 'Cards', key: 'cards', icon: 'bar-chart-line', children: [
          { label: 'Funnels', key: 'funnels' },
          { label: 'Error Tracking', key: 'error-tracking' },
          { label: 'Resource Monitoring', key: 'resource-monitoring' }
        ]
      },
      { label: 'Alerts', key: 'alerts', icon: 'bell' }
    ]
  },
  {
    title: '',
    key: 'other',
    items: [
      { label: 'Feature Flags', key: 'feature-flags', icon: 'toggles' },
      { label: 'Preferences', key: 'preferences', icon: 'sliders' },
      { label: 'Support', key: 'support', icon: 'question-circle' }
    ]
  }
];

export const preferences: Category[] = [
  {
    title: 'Preferences',
    key: 'preferences',
    items: [
      { label: 'Account', key: 'account', icon: 'user' },
      { label: 'Session Listing', key: 'session-listing', icon: 'bell' },
      { label: 'Integrations', key: 'integrations', icon: 'bell' },
      { label: 'Metadata', key: 'metadata', icon: 'bell' },
      { label: 'Webhooks', key: 'webhooks', icon: 'bell' },
      { label: 'Projects', key: 'projects', icon: 'bell' },
      { label: 'Roles & Access', key: 'roles-access', icon: 'bell' },
      { label: 'Audit', key: 'audit', icon: 'bell' },
      { label: 'Team', key: 'team', icon: 'bell' },
      { label: 'Notifications', key: 'billing', icon: 'bell' },
      { label: 'Billing', key: 'billing', icon: 'bell' },
    ]
  },
]