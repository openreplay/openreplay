import { TFunction } from 'i18next';
import React from 'react';

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
  hidden?: boolean;
}

export const enum PREFERENCES_MENU {
  ACCOUNT = 'account',
  SESSION_LISTING = 'session-listing',
  INTEGRATIONS = 'integrations',
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
  HIGHLIGHTS = 'highlights',
  LIVE_SESSIONS = 'live-sessions',
  DASHBOARDS = 'dashboards',
  CARDS = 'cards',
  FUNNELS = 'funnels',
  ERROR_TRACKING = 'error-tracking',
  ALERTS = 'alerts',
  FEATURE_FLAGS = 'feature-flags',
  USABILITY_TESTS = 'usability-tests',
  PREFERENCES = 'preferences',
  SUPPORT = 'support',
  EXIT = 'exit',
  SPOTS = 'spots',
}

export const categories: (t: TFunction) => Category[] = (t) => [
  {
    title: t('Replays'),
    key: 'replays',
    items: [
      { label: t('Sessions'), key: MENU.SESSIONS, icon: 'collection-play' },
      {
        label: t('Recommendations'),
        key: MENU.RECOMMENDATIONS,
        icon: 'magic',
        hidden: true,
      },
      {
        label: t('Vault'),
        key: MENU.VAULT,
        icon: 'safe',
        hidden: true,
      },
      { label: t('Bookmarks'), key: MENU.BOOKMARKS, icon: 'bookmark' },
      {
        label: t('Highlights'),
        key: MENU.HIGHLIGHTS,
        icon: 'chat-square-quote',
      },
    ],
  },
  {
    title: '',
    key: 'spot',
    items: [{ label: t('Spots'), key: MENU.SPOTS, icon: 'orspotOutline' }],
  },
  {
    title: '',
    key: 'assist',
    items: [
      { label: t('Co-Browse'), key: MENU.LIVE_SESSIONS, icon: 'broadcast' },
    ],
  },
  {
    title: t('Analytics'),
    key: 'analytics',
    items: [
      { label: t('Dashboards'), key: MENU.DASHBOARDS, icon: 'columns-gap' },
      { label: t('Cards'), key: MENU.CARDS, icon: 'bar-chart-line' },
      // {
      //   label: 'Cards', key: MENU.CARDS, icon: 'bar-chart-line', children: [
      //     { label: 'All', key: MENU.CARDS },
      //     { label: 'Funnels', key: MENU.FUNNELS },
      //     { label: 'Error Tracking', key: MENU.ERROR_TRACKING },
      //     { label: 'Resource Monitoring', key: MENU.RESOURCE_MONITORING }
      //   ]
      // },
      { label: t('Alerts'), key: MENU.ALERTS, icon: 'bell' },
    ],
  },
  {
    title: t('Product Optimization'),
    key: 'product-optimization',
    items: [
      { label: t('Feature Flags'), key: MENU.FEATURE_FLAGS, icon: 'toggles' },
      {
        label: 'Usability Tests',
        key: MENU.USABILITY_TESTS,
        icon: 'clipboard-check',
      },
    ],
  },
  {
    title: '',
    key: 'other',
    items: [
      {
        label: t('Preferences'),
        key: MENU.PREFERENCES,
        icon: 'sliders',
        leading: 'chevron-right',
      },
      { label: t('Support'), key: MENU.SUPPORT, icon: 'question-circle' },
    ],
  },
];

export const preferences: (t: TFunction) => Category[] = (t) => [
  {
    title: '',
    key: 'exit',
    items: [{ label: t('Exit'), key: MENU.EXIT, icon: 'arrow-bar-left' }],
  },
  {
    title: t('Preferences'),
    key: 'preferences',
    items: [
      { label: t('Account'), key: PREFERENCES_MENU.ACCOUNT, icon: 'person' },
      {
        label: t('Sessions Listing'),
        key: PREFERENCES_MENU.SESSION_LISTING,
        icon: 'card-list',
      },
      {
        label: t('Integrations'),
        key: PREFERENCES_MENU.INTEGRATIONS,
        icon: 'plug',
      },
      {
        label: t('Webhooks'),
        key: PREFERENCES_MENU.WEBHOOKS,
        icon: 'link-45deg',
      },
      { label: t('Modules'), key: PREFERENCES_MENU.MODULES, icon: 'puzzle' },
      { label: t('Projects'), key: PREFERENCES_MENU.PROJECTS, icon: 'folder2' },
      {
        label: t('Roles & Access'),
        key: PREFERENCES_MENU.ROLES_ACCESS,
        icon: 'diagram-3',
        isEnterprise: true,
        isAdmin: true,
      },
      {
        label: t('Audit'),
        key: PREFERENCES_MENU.AUDIT,
        icon: 'list-ul',
        isAdmin: true,
        isEnterprise: true,
      },
      {
        label: t('Team'),
        key: PREFERENCES_MENU.TEAM,
        icon: 'people',
        isAdmin: true,
      },
      {
        label: t('Weekly Report'),
        key: PREFERENCES_MENU.NOTIFICATIONS,
        icon: 'envelope-paper',
        hidden: false,
      },
      {
        label: t('Billing'),
        key: PREFERENCES_MENU.BILLING,
        icon: 'credit-card-2-back',
        hidden: true,
      },
    ],
  },
];

export const spotOnlyCats = [
  'spot',
  'other',
  PREFERENCES_MENU.TEAM,
  PREFERENCES_MENU.ACCOUNT,
  MENU.EXIT,
  MENU.PREFERENCES,
  MENU.SUPPORT,
  MENU.SPOTS,
];
