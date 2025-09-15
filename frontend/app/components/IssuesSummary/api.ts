import { client } from 'App/mstore';
import { Data } from './types'
import Session from 'App/types/session/session';

export async function getTagLabels(projectId: string) {
  const response = await client.get(`/kai/${projectId}/smart_labels`);
  const json = await response.json();
  const options = (json.data ?? { issueLabels: [] }).issueLabels.map((label: string) => ({
    label,
    value: label,
  }));
  return options;
}

export async function getIssues(projectId: string, usedLabels?: string[]) {
  const options = {
    issues_limit: 40,
    labels: usedLabels,
  };
  const edp = `/kai/${projectId}/smart_alerts`;
  const response = await client.post(edp, options);
  const json = await response.json();
  const data: Data[] = json.data ?? [];
  const resp: { critical: Data[]; other: Data[] } = {
    critical: [],
    other: [],
  };
  data.forEach((issue) => {
    if (issue.issueLabels.find((label) => label.name.toLowerCase() === 'critical')) {
      resp.critical.push(issue);
    } else {
      resp.other.push(issue);
    }
  });
  return resp;
}

export async function getSessions(projectId: string, params: any) {
  const sortBy = params.sortBy.includes('startTs') ? 'time' : 'events'
  const sortDir = params.sortBy.endsWith('desc') ? 'desc' : 'asc'
  const res = await client.post(`/kai/${projectId}/smart_alerts/search`, {
    issue: params.issueName,
    query: params.searchQuery || null,
    issueLabels: params.usedIssueLabels,
    journeyLabels: params.usedJourneyLabels,
    sortBy,
    sortDir,
    range: params.range,
    limit: params.limit,
    page: params.page,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const json = await res.json();

  const data = json.data.map((s: any) => {
    return ({
        session: new Session(s),
        issueDescription: s.description,
        issueLabels: s.issueLabels,
        journey: s.journey,
        journeyLabels: s.journeyLabels,
        issueTimestamp: s.issueTimestamp
      })
  });
  return data;
}

export async function hideIssue(projectId: string, issueName: string) {
  const res = await client.put(`/kai/${projectId}/smart_alerts`, {
    issue: issueName,
    operation: {
      hide: true
    }
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res;
}
