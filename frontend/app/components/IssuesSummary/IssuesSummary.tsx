import React from 'react';
import {
  Card,
  Tag,
  Select,
  Tooltip,
  Button,
  Input,
  Table,
  TableProps,
  Checkbox,
} from 'antd';
import { EyeOff, Pencil, X } from 'lucide-react';
import { useModal } from '../Modal';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouteMatch } from 'react-router-dom';
import { Data } from './types';
import { getIssues, getTagLabels, hideIssue, renameIssue } from './api';
import IssueSessions from './IssueSessionsModal';
import { Modal } from 'UI';

function getTagColor(label: string): string {
  const safeLabel = label.toLowerCase();
  if (['critical', 'error', 'high'].includes(safeLabel)) return 'red';
  if (['warning', 'medium'].includes(safeLabel)) return 'orange';
  if (['info', 'low'].includes(safeLabel)) return 'green';

  return 'blue';
}

function IssuesSummary() {
  const [renameModal, setRenameModal] = React.useState<string | null>(null);
  const [showOther, setShowOther] = React.useState(false);
  const [titleInput, setTitleInput] = React.useState('');
  const [usedLabels, setUsedLabels] = React.useState<string[]>([]);
  const match = useRouteMatch<{ siteId: string }>();
  const projectId = match.params.siteId;
  const { showModal, hideModal } = useModal();
  const { t } = useTranslation();
  const {
    data = { critical: [], other: [] },
    isPending,
    refetch,
  } = useQuery<{
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
    issueLabels: { name: string }[];
    journeyLabels: { name: string }[];
  }) => {
    showModal(
      <IssueSessions
        issueName={issue.issueName}
        issueLabels={issue.issueLabels.map((l) => l.name)}
        journeyLabels={issue.journeyLabels.map((l) => l.name)}
        projectId={projectId}
        hideModal={hideModal}
      />,
      {
        right: true,
        width: 840,
      },
    );
  };

  const handleChange = (value: string[]) => {
    setUsedLabels(value);
  };

  const onHide = async (issue: string) => {
    await hideIssue(projectId, issue);
    refetch();
  };
  const onRename = (issue: string) => {
    setTitleInput(issue);
    setRenameModal(issue);
  };
  const onRenameSave = async () => {
    if (renameModal) {
      await renameIssue(projectId, renameModal, titleInput);
    }
    refetch();
    setRenameModal(null);
  };

  const cols: TableProps['columns'] = [
    {
      title: 'Impact',
      width: 100,
      dataIndex: 'impact',
      key: 'impact',
      render: (impact: number) => <span className="mr-2">{impact}%</span>,
    },
    {
      title: 'Issue Name',
      dataIndex: 'issueName',
      key: 'issueName',
    },
    {
      title: 'Labels',
      dataIndex: 'issueLabels',
      key: 'issueLabels',
      render: (labels: { name: string }[]) => (
        <>
          {labels.map((label, idx) => (
            <Tag key={idx} color={getTagColor(label.name)}>
              {label.name}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Tooltip title="Rename this issue">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onRename(record.issueName);
              }}
              className="ml-auto"
              size="small"
            >
              <Pencil size={16} />
            </Button>
          </Tooltip>
          <Tooltip title="Hide this issue">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onHide(record.issueName);
              }}
              size="small"
            >
              <EyeOff size={16} />
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const usedData = showOther ? data.critical.concat(data.other) : data.critical;
  return (
    <>
      <Modal open={renameModal !== null} onClose={() => setRenameModal(null)}>
        <Modal.Header className="flex items-center justify-between font-semibold">
          <div>{t('Rename Issue')}</div>
          <div onClick={() => setRenameModal(null)}>
            <X size={16} />
          </div>
        </Modal.Header>
        <Modal.Content>
          <Input
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="New title"
            onKeyDown={(e) => e.key === 'Enter' && onRenameSave()}
          />
        </Modal.Content>
        <Modal.Footer className="gap-2">
          <Button onClick={() => setRenameModal(null)}>{t('Close')}</Button>
          <Button type="primary" onClick={onRenameSave}>
            {t('Save')}
          </Button>
        </Modal.Footer>
      </Modal>
      <Card
        loading={isPending}
        title={t('Issues Summary')}
        extra={
          <div className={'flex items-center gap-2'}>
            {data.other.length ? (
              <Checkbox
                checked={showOther}
                onChange={() => setShowOther(!showOther)}
              >
                Show non-critical ({data.other.length})
              </Checkbox>
            ) : null}
            <Select
              mode="multiple"
              allowClear
              style={{ width: 300 }}
              placeholder="Pick issue labels to filter"
              onChange={handleChange}
              options={labels}
              loading={isLabelsPending}
            />
          </div>
        }
        styles={{
          body: {
            padding: 0,
          },
          header: {
            padding: '0 12px',
          },
        }}
      >
        <Table
          columns={cols}
          dataSource={usedData}
          loading={isPending}
          rowKey="issueName"
          pagination={false}
          onRow={(record) => ({
            onClick: () => onIssueClick(record),
          })}
          rowClassName={'cursor-pointer'}
        />
      </Card>
    </>
  );
}

export default IssuesSummary;
