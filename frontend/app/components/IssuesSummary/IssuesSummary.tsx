import React from 'react';
import {
  Card,
  Tag,
  Select,
  Button,
  Input,
  Table,
  TableProps,
  Checkbox,
  Dropdown,
} from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { X } from 'lucide-react';
import { useModal } from '../Modal';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouteMatch } from 'react-router-dom';
import { Data } from './types';
import { getIssues, getTagLabels, hideIssue, renameIssue } from './api';
import IssueSessions from './IssueSessionsModal';
import { Modal, confirm } from 'UI';

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
  const [showHighImpact, setShowHighImpact] = React.useState(true);
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
    const ok = await confirm({
      header: 'Hide Issue',
      confirmButton: 'Yes, hide',
      confirmation: 'Permamently hide this issue?',
    } as any);
    if (!ok) return;
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

  const cols: TableProps<Data>['columns'] = [
    {
      title: 'Impact',
      width: 100,
      dataIndex: 'impact',
      key: 'impact',
      render: (impact: number) => <span className="mr-2">{impact}%</span>,
      sorter: (a, b) => a.impact - b.impact,
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
      title: '',
      width: '5%',
      key: 'actions',
      render: (_, record) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            arrow={false}
            trigger={['click']}
            className={'ignore-prop-dp'}
            menu={{
              items: [
                {
                  key: 'rename',
                  label: 'Rename',
                },
                {
                  key: 'hide',
                  label: 'Hide',
                },
              ],
              onClick: ({ key }) => {
                if (key === 'rename') {
                  onRename(record.issueName);
                } else if (key === 'hide') {
                  void onHide(record.issueName);
                }
              },
            }}
          >
            <Button
              id="ignore-prop"
              icon={<MoreOutlined />}
              type="text"
              className="btn-dashboards-list-item-more-options"
            />
          </Dropdown>
        </div>
      ),
    },
  ];

  const possibleTarget = localStorage.getItem('issueImpactTarget');
  const impactTarget = possibleTarget ? parseInt(possibleTarget, 10) : 3;
  const usedData = (
    showOther ? data.critical.concat(data.other) : data.critical
  ).filter((issue) => !showHighImpact || issue.impact > impactTarget);
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
            <Checkbox
              checked={showHighImpact}
              onChange={() => setShowHighImpact(!showHighImpact)}
            >
              {t('Show high impact')}
            </Checkbox>
            {data.other.length ? (
              <Checkbox
                checked={showOther}
                onChange={() => setShowOther(!showOther)}
              >
                {t('Show non-critical')} ({data.other.length})
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
        <Table<Data>
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
