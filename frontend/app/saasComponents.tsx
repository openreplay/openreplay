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

export const saasRoutes: Route[] = [
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

export const extraMenuItems = (siteId: string | null) => ({
  [MENU.ISSUES]: () => withSiteId(smartIssues(), siteId),
});
