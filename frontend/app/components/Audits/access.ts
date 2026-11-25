import { anyAgentEnabled } from 'App/utils/split-utils';

export const AUDITS_PERMISSION = 'AUDITS';

interface PermissionSource {
  account?: { permissions?: string[] | null } | null;
  isEnterprise: boolean;
  isAdmin?: boolean | null;
}

/**
 * The user holds `AUDITS` (HOCs/withPermissions' rule: admins and non-enterprise accounts
 * pass). Every audits API route checks it and answers 403 without it, which the API client
 * treats as a dead session. Pair with split-utils `agentAuditsEnabled()` (the feature).
 */
export function hasAuditsPermission(user: PermissionSource): boolean {
  if (user.isAdmin || !user.isEnterprise) return true;
  return (user.account?.permissions ?? []).includes(AUDITS_PERMISSION);
}

/** A guess at AI access while the estimate loads; its `aiAvailable` (per project) decides. */
export const hasArmadaAccess = (): boolean => anyAgentEnabled();
