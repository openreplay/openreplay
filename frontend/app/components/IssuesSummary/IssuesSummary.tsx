import React from 'react';
import { Card, Tag, Select } from 'antd';
import { useModal } from '../Modal';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { client } from 'App/mstore';
import { useRouteMatch } from 'react-router-dom';
import Session from '@/types/session';
import SessionItem from '../shared/SessionItem';

interface Data {
  issueName: string;
  count: number;
  sessions: any[];
  labels: string[];
}

function getTagColor(label: string): string {
  const safeLabel = label.toLowerCase();
  if (['critical', 'error', 'high'].includes(safeLabel)) return 'red';
  if (['warning', 'medium'].includes(safeLabel)) return 'orange';
  if (['info', 'low'].includes(safeLabel)) return 'green';

  return 'blue';
}

async function getTagLabels(projectId: string) {
  const response = await client.get(`/kai/${projectId}/smart_labels`);
  const json = await response.json();
  const options = (json.data ?? []).map((label: string) => ({
    label,
    value: label,
  }));
  return options;
}

async function getIssues(
  projectId: string,
  usedLabels?: string[],
): Promise<Data[]> {
  const options = {
    issues_limit: 20,
    sessions_limit: 20,
    labels: usedLabels,
  };
  const edp = `/kai/${projectId}/smart_alerts`;
  const response = await client.post(edp, options);
  const json = await response.json();
  return json.data ?? [];
}

function IssuesSummary() {
  const [usedLabels, setUsedLabels] = React.useState<string[]>([]);
  const match = useRouteMatch<{ siteId: string }>();
  const projectId = match.params.siteId;
  const { showModal } = useModal();
  const { t } = useTranslation();
  const { data = [], isPending } = useQuery<Data[]>({
    queryKey: ['issuesSummary', projectId, usedLabels],
    queryFn: () => getIssues(projectId, usedLabels),
  });
  const { data: labels = [], isPending: isLabelsPending } = useQuery<
    { label: string; value: string }[]
  >({
    queryKey: ['tagLabels', projectId],
    queryFn: () => getTagLabels(projectId),
  });

  const onIssueClick = async (issue: {
    issueName: string;
    sessions: any[];
  }) => {
    const sessions: { session: Session; issue: string }[] = issue.sessions.map(
      (session: any) => ({
        session: new Session(session),
        issue: session.issueDescription,
      }),
    );
    showModal(<IssueSessions sessions={sessions} />, {
      right: true,
      width: 720,
    });
  };

  const handleChange = (value: string[]) => {
    setUsedLabels(value);
  };
  return (
    <Card
      loading={isPending}
      title={t('Issues Summary')}
      extra={
        <Select
          mode="multiple"
          allowClear
          style={{ width: 300 }}
          placeholder="Pick issue labels to filter"
          onChange={handleChange}
          options={labels}
          loading={isLabelsPending}
        />
      }
    >
      <div className="flex flex-col gap-2">
        {data.map((issue, index) => (
          <div
            className="w-full gap-4 flex items-center p-2 hover:bg-active-blue rounded-lg cursor-pointer"
            key={index}
            onClick={() => onIssueClick(issue)}
          >
            <Tag>{issue.count}</Tag>
            <div className="font-semibold">{issue.issueName}</div>
            <div className="flex items-center flex-wrap">
              {issue.labels.map((label, idx) => (
                <Tag key={idx} color={getTagColor(label)}>
                  {label}
                </Tag>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function IssueSessions({
  sessions,
}: {
  sessions: { session: Session; issue: string }[];
}) {
  return (
    <div className="flex flex-col gap-2 h-screen overflow-y-auto bg-white">
      {sessions.map((session, index) => (
        <div>
          <SessionItem key={index} session={session.session} />
          <div className="text-gray-500 text-sm px-4">
            {session.issue || 'No issue description available'}
          </div>
        </div>
      ))}
    </div>
  );
}

export default IssuesSummary;
