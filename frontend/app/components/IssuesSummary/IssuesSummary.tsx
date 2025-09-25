import React from 'react';
import { Card, Tag, Select, Tooltip, Button, Input } from 'antd';
import {
  ChevronDown,
  ChevronRight,
  EyeOff,
  Loader,
  Pencil,
  X,
} from 'lucide-react';
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
            {isPending && <Loader className="animate-spin" size={16} />}
          </div>
          {data.critical.map((issue, index) => (
            <Issue
              key={index}
              issue={issue}
              index={index}
              onIssueClick={onIssueClick}
              onHide={() => onHide(issue.issueName)}
              onRename={() => onRename(issue.issueName)}
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
                  onHide={() => onHide(issue.issueName)}
                  onRename={() => onRename(issue.issueName)}
                />
              ))
            : null}
        </div>
      </Card>
    </>
  );
}

function Issue({
  issue,
  index,
  onIssueClick,
  onHide,
  onRename,
}: {
  issue: Data;
  index: number;
  onIssueClick: (issue: Data) => void;
  onHide: () => void;
  onRename: () => void;
}) {
  const onHideClick = (e) => {
    e.stopPropagation();
    onHide();
  };
  const onRenameClick = (e) => {
    e.stopPropagation();
    onRename();
  };
  return (
    <div
      className="w-full gap-4 flex items-center p-2 hover:bg-active-blue rounded-lg cursor-pointer"
      key={index}
      onClick={() => onIssueClick(issue)}
    >
      <Tag className="min-w-[56px] text-center">
        {Math.round(issue.impact)}%
      </Tag>
      <div className="font-semibold">{issue.issueName}</div>
      <div className="flex items-center flex-wrap">
        {issue.issueLabels.map((label, idx) => (
          <Tag key={idx} color={getTagColor(label.name)}>
            {label.name}
          </Tag>
        ))}
      </div>
      <Tooltip title="Rename this issue">
        <Button onClick={onRenameClick} className="ml-auto" size="small">
          <Pencil size={16} />
        </Button>
      </Tooltip>
      <Tooltip title="Hide this issue">
        <Button onClick={onHideClick} size="small">
          <EyeOff size={16} />
        </Button>
      </Tooltip>
    </div>
  );
}

export default IssuesSummary;
