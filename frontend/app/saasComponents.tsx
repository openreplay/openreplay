import React from 'react';

export const saasComponents = {};
interface Route {
  path: string;
  component: React.ReactNode;
  withId: boolean;
  canChangeId: boolean;
}

export const smartAlerts = () => '/smart_alerts';

export const saasRoutes: Route[] = [
  {
    path: smartAlerts(),
    component: React.lazy(
      () => import('./components/IssuesSummary/IssuesSummary'),
    ),
    withId: true,
    canChangeId: true,
  },
];
