import React from 'react';
import { Card, Tag } from 'antd';
import { useModal } from '../Modal';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { client } from 'App/mstore';
import { useRouteMatch } from 'react-router-dom';
import Session from '@/types/session';
import SessionItem from '../shared/SessionItem';

function IssuesSummary() {
  const match = useRouteMatch<{ siteId: string }>();
  const projectId = match.params.siteId;
  const edp = `/kai/${projectId}/smart_alerts?issues_limit=20&sessions_limit=20`;
  const { showModal } = useModal();
  const { t } = useTranslation();
  const { data = [], isPending } = useQuery({
    queryKey: ['issuesSummary', projectId],
    queryFn: async () => {
      const response = await client.get(edp);
      const json = await response.json();
      return json.data ?? [];
    },
  });

  const onIssueClick = async (issue: { issueName: string, sessions: any[] }) => {
    const sessions: Session[] = issue.sessions.map((session: any) => new Session(session));
    showModal(<IssueSessions sessions={sessions} />, { right: true, width: 720 });
  };
  return (
    <Card loading={isPending} title={t('Issues Summary')}>
      <div className="flex flex-col gap-2">
        {data.map((issue, index) => (
          <div
            className="w-full gap-4 flex items-center p-2 hover:bg-active-blue rounded-lg cursor-pointer"
            key={index}
            onClick={() => onIssueClick(issue)}
          >
            <Tag>{issue.count}</Tag>
            <div className="font-semibold">{issue.issueName}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function IssueSessions({ sessions }: { sessions: Session[] }) {
  return (
    <div className="flex flex-col gap-2 h-screen overflow-y-auto bg-white">
      {sessions.map((session, index) => (
        <SessionItem
          key={index}
          session={session}
        />
      ))}
    </div>
  )
}

export default IssuesSummary;
