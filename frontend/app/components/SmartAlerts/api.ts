import { client } from 'App/mstore';

/* Raw issue row from the smart-alerts endpoint (same contract IssuesSummary
   used). The redesign needs more than this returns — see HANDOFF data contract
   and the backend checklist in the issues store. */
export interface RawIssue {
  issueName: string;
  impact: number;
  issueLabels: { name: string; ratio: number }[];
  journeyLabels: { name: string; ratio: number }[];
}

export interface RawIssueSession {
  sessionId: string;
  userId?: string;
  userBrowser?: string;
  userOs?: string;
  userDeviceType?: string;
  userCountry?: string;
  userCity?: string;
  duration?: number;
  startTs?: number;
  timestamp?: number;
  eventsCount?: number;
  metadata?: Record<string, any> | null;
  description?: string;
  journey?: string;
  // the search endpoint returns these as plain strings (unlike the issue-list
  // endpoint, which uses { name, ratio }) — accept both shapes
  issueLabels?: (string | { name: string })[];
  journeyLabels?: (string | { name: string })[];
  issueTimestamp?: number | null;
}

export async function getTagLabels(projectId: string): Promise<string[]> {
  const response = await client.get(`/kai/${projectId}/smart_labels`);
  const json = await response.json();
  return (json.data ?? { issueLabels: [] }).issueLabels ?? [];
}

export async function getIssues(
  projectId: string,
  labels?: string[],
): Promise<RawIssue[]> {
  const response = await client.post(`/kai/${projectId}/smart_alerts`, {
    issues_limit: 40,
    labels,
  });
  const json = await response.json();
  return json.data ?? [];
}

export async function getIssueSessions(
  projectId: string,
  issueName: string,
  opts: {
    query?: string | null;
    issueLabels?: string[];
    journeyLabels?: string[];
    range?: [number, number];
    limit?: number;
    page?: number;
  } = {},
): Promise<{ rows: RawIssueSession[]; total: number }> {
  const res = await client.post(`/kai/${projectId}/smart_alerts/search`, {
    issue: issueName,
    query: opts.query ?? null,
    issueLabels: opts.issueLabels ?? [],
    journeyLabels: opts.journeyLabels ?? [],
    sortBy: 'time',
    sortDir: 'desc',
    range: opts.range ?? [Date.now() - 30 * 24 * 60 * 60 * 1000, Date.now()],
    limit: opts.limit ?? 50,
    page: opts.page ?? 1,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const json = await res.json();
  const rows: RawIssueSession[] = json.data ?? [];
  // prefer a server-provided total; otherwise fall back to the returned count
  const total: number = json.total ?? json.count ?? rows.length;
  return { rows, total };
}

export async function hideIssue(projectId: string, issueName: string) {
  const res = await client.put(`/kai/${projectId}/smart_alerts`, {
    issue: issueName,
    operation: { hide: true },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res;
}

export async function renameIssue(
  projectId: string,
  issueName: string,
  newName: string,
) {
  const res = await client.put(`/kai/${projectId}/smart_alerts`, {
    issue: issueName,
    operation: { rename: newName },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res;
}
