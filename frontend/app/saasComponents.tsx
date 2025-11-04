import React from 'react';

export const saasComponents = {};
interface Route {
  path: string;
  component: React.ReactNode;
  withId: boolean;
  canChangeId: boolean;
}

export const saasRoutes: Route[] = [];
