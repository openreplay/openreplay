import React from 'react';

import { MENU } from 'App/layout/data';
import { agentsEnabled } from 'App/utils/split-utils';

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

/* Smart Issues rides the same in-progress gate as the rest of the Agents
   section (layout/data.ts): off => no route registered and no menu URL, so the
   surface is fully hidden rather than only permission-guarded. */
export const saasRoutes: Route[] = agentsEnabled() ? smartIssuesRoutes : [];

export const extraMenuItems = (siteId: string | null) =>
  agentsEnabled()
    ? { [MENU.ISSUES]: () => withSiteId(smartIssues(), siteId) }
    : {};
