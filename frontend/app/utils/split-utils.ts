/**
 * can be overwritten in saas or ee editions
 * */
import { planFeatures } from 'App/utils/planFeatures';

/** feature keys the backend returns in `/account` -> `plan.features` */
export type PlanFeature = 'agent-issues' | 'agent-tests' | 'agent-audits';

export const hasPlanFeature = (feature: PlanFeature): boolean =>
  planFeatures().includes(feature);

/**
 * Smart Issues pages + the agentic parts of segments / saved searches
 * (capture toggle, agent instructions, "Issues Agent" column).
 */
export const agentIssuesEnabled = (): boolean => hasPlanFeature('agent-issues');

/** Test agent: the Tests page and its settings tab (SmartTests). */
export const agentTestsEnabled = (): boolean => hasPlanFeature('agent-tests');

/** Audits agent (SaaS): its page lives in `saas/audits`. */
export const agentAuditsEnabled = (): boolean => hasPlanFeature('agent-audits');

/** Surfaces shared by both agents: the Agents menu section and its preferences tab. */
export const anyAgentEnabled = (): boolean =>
  agentIssuesEnabled() || agentTestsEnabled();

export const hasAi = false;
export const hasHealth = true;
export const hasSampling = true;

export const menuHidden = {
  clips: true,
  vault: true,
  bookmarks: false,
  billing: true,
  videoExport: false,
  dataAnalytics: false,
  lexicon: false,
  segments: false,
};
