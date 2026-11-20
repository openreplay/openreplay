import { TFunction } from 'i18next';
import React from 'react';

import {
  anyAgentEnabled,
  menuHidden,
  otelLogsEnabled,
} from 'App/utils/split-utils';

export interface MenuItem {
  label: React.ReactNode;
  key: React.Key;
  hidden?: boolean;
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
  SESSION_SETTINGS = 'sessions-settings',
  INTEGRATIONS = 'integrations',
  WEBHOOKS = 'webhooks',
  PROJECTS = 'projects',
  ROLES_ACCESS = 'roles-access',
  AUDIT = 'audit',
  TEAM = 'team',
  BILLING = 'billing',
  EXPORTED_VIDEOS = 'exported-videos',
  TEST_AGENTS = 'test-agents',
  AGENTS = 'agents',
  OPENTELEMETRY = 'opentelemetry',
}

export const enum MENU {
  SESSIONS = 'sessions',
  RECOMMENDATIONS = 'recommendations',
  VAULT = 'vault',
  BOOKMARKS = 'bookmarks',
  LIVE_SESSIONS = 'live-sessions',
  DASHBOARDS = 'dashboards',
  CARDS = 'cards',
  FUNNELS = 'funnels',
  ERROR_TRACKING = 'error-tracking',
  ALERTS = 'alerts',
  PREFERENCES = 'preferences',
  SUPPORT = 'support',
  EXIT = 'exit',
  SPOTS = 'spots',
  AGENTS = 'agents',
  TEST_AGENTS = 'agents-tests',
  AUDITS = 'agents-audits',
  ACTIVITY = 'activity',
  USER = 'user-page',
  USERS = 'data-users',
  EVENTS = 'data-events',
  PROPS = 'data-properties',
  DATA_MANAGEMENT = 'data-management',
  SEGMENTS = 'data-segments',
  TAGS = 'data-tags',
  ISSUES = 'issues',
  LOGS = 'logs',
  TRACES = 'traces',
  OTEL_METRICS = 'otel-metrics',
}

export const preferences: (t: TFunction) => Category[] = (t) => [
  {
    title: t('Preferences'),
    key: 'preferences',
    items: [
      { label: t('Account'), key: PREFERENCES_MENU.ACCOUNT },
      {
        label: t('Session Settings'),
        key: PREFERENCES_MENU.SESSION_SETTINGS,
      },
      {
        label: t('Integrations'),
        key: PREFERENCES_MENU.INTEGRATIONS,
      },
      {
        label: t('Webhooks'),
        key: PREFERENCES_MENU.WEBHOOKS,
      },
      { label: t('Projects'), key: PREFERENCES_MENU.PROJECTS },
      {
        label: t('Roles & Access'),
        key: PREFERENCES_MENU.ROLES_ACCESS,
        isEnterprise: true,
        isAdmin: true,
      },
      {
        label: t('Audit'),
        key: PREFERENCES_MENU.AUDIT,
        isAdmin: true,
        isEnterprise: true,
      },
      {
        label: t('Team'),
        key: PREFERENCES_MENU.TEAM,
        isAdmin: true,
      },
      {
        label: t('Billing'),
        key: PREFERENCES_MENU.BILLING,
        hidden: menuHidden.billing,
      },
      {
        label: t('Exported Videos'),
        key: PREFERENCES_MENU.EXPORTED_VIDEOS,
        hidden: menuHidden.videoExport,
      },
      {
        label: t('OpenTelemetry'),
        key: PREFERENCES_MENU.OPENTELEMETRY,
        hidden: !otelLogsEnabled(),
      },
      {
        // shared preferences for the agents: journey tags, critical rules,
        // notifications by category + behaviour toggles. Core config
        // (environments, run defaults) stays with each agent's page.
        label: t('Agents'),
        key: PREFERENCES_MENU.AGENTS,
        hidden: !anyAgentEnabled(),
      },
    ],
  },
];
