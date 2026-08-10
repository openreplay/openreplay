/**
 * can be overwritten in saas or ee editions
 * */

/**
 * Feature flag for the AI "agents" surface: the Smart Issues pages, the agent
 * settings tab, and the "Issues Agent" capture column on segments / saved
 * searches. Toggle via localStorage `__test_agents__`; hard-code the return
 * (e.g. `return true`) to force it on/off everywhere.
 */
export const agentsEnabled = (): boolean => {
  try {
    return window.localStorage.getItem('__test_agents__') === 'true';
  } catch {
    return false;
  }
};

export const hasAi = false;
export const hasHealth = true;
export const hasIssuesSummary = false;
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
