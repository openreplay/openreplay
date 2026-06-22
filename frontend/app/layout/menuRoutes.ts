import { extraMenuItems } from 'App/saasComponents';

export const extraRoutes = (siteId: string | null) => ({
  ...extraMenuItems(siteId),
});
