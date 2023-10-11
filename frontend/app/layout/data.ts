import React from 'react';
import PreferencesMenu from 'Components/Client/PreferencesMenu';

export interface MenuItem {
  label: React.ReactNode;
  key: React.Key;
  icon?: string;
  children?: MenuItem[];
  route?: string;
  hidden?: boolean;
  disabled?: boolean;
  leading?: any;
  isEnterprise?: boolean;
  isAdmin?: boolean;
}

interface Category {
  title: React.ReactNode;
  key: React.Key;
  items: MenuItem[];
}

export const enum PREFERENCES_MENU {
  ACCOUNT = 'account',
  SESSION_LISTING = 'session-listing',
  INTEGRATIONS = 'integrations',
  METADATA = 'metadata',
  WEBHOOKS = 'webhooks',
  MODULES = 'modules',
  PROJECTS = 'projects',
  ROLES_ACCESS = 'roles-access',
  AUDIT = 'audit',
  TEAM = 'team',
  NOTIFICATIONS = 'notifications',
  BILLING = 'billing',
}

export const enum MENU {
  SESSIONS = 'sessions',
  RECOMMENDATIONS = 'recommendations',
  VAULT = 'vault',
  BOOKMARKS = 'bookmarks',
  NOTES = 'notes',
  LIVE_SESSIONS = 'live-sessions',
  RECORDINGS = 'recordings',
  DASHBOARDS = 'dashboards',
  CARDS = 'cards',
  FUNNELS = 'funnels',
  ERROR_TRACKING = 'error-tracking',
  RESOURCE_MONITORING = 'resource-monitoring',
  ALERTS = 'alerts',
  FEATURE_FLAGS = 'feature-flags',
  PREFERENCES = 'preferences',
  SUPPORT = 'support',
}

export const categories: Category[] = [
  {
    title: 'Replays',
    key: 'replays',
    items: [
      { label: 'Sessions', key: MENU.SESSIONS, icon: 'collection-play' },
      // { label: 'Recommendations', key: MENU.RECOMMENDATIONS, icon: 'magic' },
      // { label: 'Vault', key: MENU.VAULT, icon: 'safe' },
      { label: 'Bookmarks', key: MENU.BOOKMARKS, icon: 'bookmark' },
      { label: 'Notes', key: MENU.NOTES, icon: 'stickies' }
    ]
  },
  {
    title: 'Assist',
    key: 'assist',
    items: [
      { label: 'Cobrowse', key: MENU.LIVE_SESSIONS, icon: 'broadcast' },
      { label: 'Recordings', key: MENU.RECORDINGS, icon: 'record-btn', isEnterprise: true }
    ]
  },
  {
    title: 'Analytics',
    key: 'analytics',
    items: [
      { label: 'Dashboards', key: MENU.DASHBOARDS, icon: 'columns-gap' },
      { label: 'Cards', key: MENU.CARDS, icon: 'bar-chart-line' },
      // {
      //   label: 'Cards', key: MENU.CARDS, icon: 'bar-chart-line', children: [
      //     { label: 'All', key: MENU.CARDS },
      //     { label: 'Funnels', key: MENU.FUNNELS },
      //     { label: 'Error Tracking', key: MENU.ERROR_TRACKING },
      //     { label: 'Resource Monitoring', key: MENU.RESOURCE_MONITORING }
      //   ]
      // },
      { label: 'Alerts', key: MENU.ALERTS, icon: 'bell' }
    ]
  },
  {
    title: '',
    key: 'other',
    items: [
      { label: 'Feature Flags', key: MENU.FEATURE_FLAGS, icon: 'toggles' },
      { label: 'Preferences', key: MENU.PREFERENCES, icon: 'sliders', leading: 'chevron-right' },
      { label: 'Support', key: MENU.SUPPORT, icon: 'question-circle' }
    ]
  }
];

export const preferences: Category[] = [
  {
    title: 'Preferences',
    key: 'preferences',
    items: [
      { label: 'Account', key: PREFERENCES_MENU.ACCOUNT, icon: 'person' },
      { label: 'Session Listing', key: PREFERENCES_MENU.SESSION_LISTING, icon: 'card-list' },
      { label: 'Integrations', key: PREFERENCES_MENU.INTEGRATIONS, icon: 'plug' },
      { label: 'Metadata', key: PREFERENCES_MENU.METADATA, icon: 'tags' },
      { label: 'Webhooks', key: PREFERENCES_MENU.WEBHOOKS, icon: 'link-45deg' },
      { label: 'Modules', key: PREFERENCES_MENU.MODULES, icon: 'puzzle' },
      { label: 'Projects', key: PREFERENCES_MENU.PROJECTS, icon: 'folder2' },
      {
        label: 'Roles & Access',
        key: PREFERENCES_MENU.ROLES_ACCESS,
        icon: 'diagram-3',
        isEnterprise: true,
        isAdmin: true
      },
      { label: 'Audit', key: PREFERENCES_MENU.AUDIT, icon: 'list-ul', isAdmin: true, isEnterprise: true },
      { label: 'Team', key: PREFERENCES_MENU.TEAM, icon: 'people', isAdmin: true },
      { label: 'Notifications', key: PREFERENCES_MENU.NOTIFICATIONS, icon: 'bell' },
      { label: 'Billing', key: PREFERENCES_MENU.BILLING, icon: 'bell', hidden: true }
    ]
  }
];