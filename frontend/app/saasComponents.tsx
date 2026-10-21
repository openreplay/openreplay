import React from 'react';

import { MENU } from 'App/layout/data';
import {
  agentAuditsEnabled,
  agentIssuesEnabled,
  agentTestsEnabled,
} from 'App/utils/split-utils';

export const saasComponents = {};
interface Route {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  withId: boolean;
  canChangeId: boolean;
  /** read at render time, not at module scope — see saasRoutes below */
  enabled: () => boolean;
}

export const smartIssues = () => '/smart-issues';
export const smartIssueDetails = (id: string | number = ':issueId') =>
  `/smart-issues/${id}`;
export const smartIssueSession = (
  id: string | number = ':issueId',
  sessionId: string | number = ':sessionId',
) => `/smart-issues/${id}/session/${sessionId}`;

export const testAgents = () => '/test-agents';
export const audits = () => '/audits';

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
    enabled: agentIssuesEnabled,
  },
  {
    path: smartIssueDetails(),
    component: React.lazy(
      () => import('./components/SmartAlerts/IssueDetail/IssueDetail'),
    ),
    withId: true,
    canChangeId: true,
    enabled: agentIssuesEnabled,
  },
  {
    path: smartIssueSession(),
    component: React.lazy(
      () => import('./components/SmartAlerts/IssuePlayer/IssuePlayer'),
    ),
    withId: true,
    canChangeId: true,
    enabled: agentIssuesEnabled,
  },
];

const testAgentsRoutes: Route[] = [
  {
    path: testAgents(),
    component: React.lazy(
      () => import('./components/Client/SmartTests/StandalonePage'),
    ),
    withId: true,
    canChangeId: false,
    enabled: agentTestsEnabled,
  },
];

const auditsRoutes: Route[] = [
  {
    path: audits(),
    component: React.lazy(() => import('Saas/audits/AuditsPage')),
    withId: true,
    canChangeId: true,
    enabled: agentAuditsEnabled,
  },
];

/* The whole list is exported: plan features only arrive with /account, long
   after this module is evaluated, so PrivateRoutes filters on `enabled()` at
   render time instead. */
export const saasRoutes: Route[] = [
  ...smartIssuesRoutes,
  ...testAgentsRoutes,
  ...auditsRoutes,
];

export const extraMenuItems = (siteId: string | null) => ({
  ...(agentIssuesEnabled()
    ? { [MENU.ISSUES]: () => withSiteId(smartIssues(), siteId) }
    : {}),
  ...(agentTestsEnabled()
    ? { [MENU.TEST_AGENTS]: () => withSiteId(testAgents(), siteId) }
    : {}),
  ...(agentAuditsEnabled()
    ? { [MENU.AUDITS]: () => withSiteId(audits(), siteId) }
    : {}),
});
