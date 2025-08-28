import React from 'react';
import { Card, Tag, Select } from 'antd';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useModal } from '../Modal';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouteMatch } from 'react-router-dom';
import { Data } from './types'
import { getIssues, getTagLabels } from './api'
import IssueSessions from './IssueSessionsModal'

function getTagColor(label: string): string {
  const safeLabel = label.toLowerCase();
  if (['critical', 'error', 'high'].includes(safeLabel)) return 'red';
  if (['warning', 'medium'].includes(safeLabel)) return 'orange';
  if (['info', 'low'].includes(safeLabel)) return 'green';

  return 'blue';
}

function IssuesSummary() {
  const [showOther, setShowOther] = React.useState(false);
  const [usedLabels, setUsedLabels] = React.useState<string[]>([]);
  const match = useRouteMatch<{ siteId: string }>();
  const projectId = match.params.siteId;
  const { showModal } = useModal();
  const { t } = useTranslation();
  const { data = { critical: [], other: [] }, isPending } = useQuery<{
    critical: Data[];
    other: Data[];
  }>({
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
    labels: { name: string }[];
  }) => {
    showModal(
      <IssueSessions
        issueName={issue.issueName}
        labels={issue.labels.map(l => l.name)}
        projectId={projectId}
      />,
      {
        right: true,
        width: 720,
      },
    );
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
        <div className="flex items-center gap-4 px-2">
          <Tag>Impact</Tag>
          <div>Issues</div>
        </div>
        {data.critical.map((issue, index) => (
          <Issue
            key={index}
            issue={issue}
            index={index}
            onIssueClick={onIssueClick}
          />
        ))}
        <div
          className="cursor-pointer p-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-active-blue"
          onClick={() => setShowOther(!showOther)}
        >
          <div>
            {t('Other issues')} ({data.other.length})
          </div>
          {showOther ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
        {showOther
          ? data.other.map((issue, index) => (
              <Issue
                key={index}
                issue={issue}
                index={index}
                onIssueClick={onIssueClick}
              />
            ))
          : null}
      </div>
    </Card>
  );
}

function Issue({
  issue,
  index,
  onIssueClick,
}: {
  issue: Data;
  index: number;
  onIssueClick: (issue: Data) => void;
}) {
  return (
    <div
      className="w-full gap-4 flex items-center p-2 hover:bg-active-blue rounded-lg cursor-pointer"
      key={index}
      onClick={() => onIssueClick(issue)}
    >
      <Tag>{issue.impact}%</Tag>
      <div className="font-semibold">{issue.issueName}</div>
      <div className="flex items-center flex-wrap">
        {issue.labels.map((label, idx) => (
          <Tag key={idx} color={getTagColor(label.name)}>
            {label.name}
          </Tag>
        ))}
      </div>
    </div>
  );
}

export default IssuesSummary;
