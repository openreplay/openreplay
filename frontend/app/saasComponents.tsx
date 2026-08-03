import React from 'react';

import { MENU } from 'App/layout/data';

export const saasComponents = {};
interface Route {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  withId: boolean;
  canChangeId: boolean;
}

export const smartIssues = () => '/smart-issues';
export const smartIssueDetails = (id: string | number = ':issueId') =>
  `/smart-issues/${id}`;
export const smartIssueSession = (
  id: string | number = ':issueId',
  sessionId: string | number = ':sessionId',
) => `/smart-issues/${id}/session/${sessionId}`;

const siteIdToUrl = (
  siteId: string | string[] | null | undefined = ':siteId',
): string => {
  if (Array.isArray(siteId)) {
    return ':siteId';
  }
  if (siteId == null) {
    return ':siteId';
  }
  return siteId;
};
export const withSiteId = (
  route: string,
  siteId: string | string[] | null | undefined = ':siteId',
): string => `/${siteIdToUrl(siteId)}${route}`;

/* Smart Issues rides the same in-progress gate as the rest of the Agents
   section (Tests menu + Preferences > Agents in layout/data.ts): the
   `__test_agents__` localStorage flag. Off => no route registered and no menu
   URL, so the surface is fully hidden, not just permission-guarded. Toggle +
   reload to flip it (read at module load, like the menu categories). */
export const agentsEnabled = (): boolean => {
  try {
    return window.localStorage.getItem('__test_agents__') === 'true';
  } catch {
    return false;
  }
};

const smartIssuesRoutes: Route[] = [
  {
    path: smartIssues(),
    component: React.lazy(
      () => import('./components/SmartAlerts/IssueList/IssuesList'),
    ),
    withId: true,
    canChangeId: true,
  },
  {
    path: smartIssueDetails(),
    component: React.lazy(
      () => import('./components/SmartAlerts/IssueDetail/IssueDetail'),
    ),
    withId: true,
    canChangeId: true,
  },
  {
    path: smartIssueSession(),
    component: React.lazy(
      () => import('./components/SmartAlerts/IssuePlayer/IssuePlayer'),
    ),
    withId: true,
    canChangeId: true,
  },
];

export const saasRoutes: Route[] = agentsEnabled() ? smartIssuesRoutes : [];

export const extraMenuItems = (siteId: string | null) =>
  agentsEnabled()
    ? { [MENU.ISSUES]: () => withSiteId(smartIssues(), siteId) }
    : {};
