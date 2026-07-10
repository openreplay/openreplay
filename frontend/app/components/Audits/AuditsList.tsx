import withPageTitle from 'HOCs/withPageTitle';
import { Button, Dropdown, Input, Progress, Segmented, Table, Tag, Tooltip, message } from 'antd';
import type { TableColumnsType } from 'antd';
import {
  Album,
  EllipsisVertical,
  FileText,
  Info,
  Plus,
  Presentation,
  Trash2,
} from 'lucide-react';
import React from 'react';
import { useHistory } from 'App/routing';
import { withSiteId, auditReport as auditReportRoute } from 'App/routes';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

import NewAuditDrawer from './NewAuditDrawer';
import { Audit, auditsStore, useAuditsStore } from './auditsStore';

/* Audits home (Agents → Audits) — the UX-audit agent ("CYUX", Mehdi 06-29 /
   07-01): each audit is a long-running JOB over a sample of sessions that
   produces a static consulting-style artifact. This list is deliberately
   simple ("the workflow may not be complicated") — the report is the product. */

type StatusTab = 'all' | 'running' | 'ready';

const scoreColor = (score: number) =>
  score >= 75
    ? 'var(--color-teal)'
    : score >= 50
      ? 'var(--color-orange)'
      : 'var(--color-red)';

function AuditsList() {
  const { audits } = useAuditsStore();
  const { projectsStore } = useStore();
  const { siteId } = projectsStore;
  const history = useHistory();
  const [statusTab, setStatusTab] = React.useState<StatusTab>('all');
  const [query, setQuery] = React.useState('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // demo liveness: running audits progress while the page is open; announce
  // completions the way the real thing would (plus the email, if asked)
  React.useEffect(() => {
    const t = window.setInterval(() => {
      auditsStore.advance().forEach((a) => {
        message.success(
          `Audit ready — ${a.name}${a.emailWhenDone ? '. We also emailed you a link.' : ''}`,
        );
      });
    }, 1800);
    return () => window.clearInterval(t);
  }, []);

  const q = query.trim().toLowerCase();
  const visible = audits
    .filter((a) => statusTab === 'all' || a.status === statusTab)
    .filter((a) => !q || a.name.toLowerCase().includes(q));

  const runningCount = audits.filter((a) => a.status === 'running').length;
  const readyCount = audits.filter((a) => a.status === 'ready').length;

  const openReport = (a: Audit) => {
    if (a.status !== 'ready') {
      message.info('This audit is still running — the report opens when it’s ready.');
      return;
    }
    history.push(withSiteId(auditReportRoute(String(a.id)), siteId));
  };

  const download = (kind: 'PDF' | 'slides') =>
    message.success(`Export started — the ${kind} will be emailed to you.`);

  const faded = (n: number) => (
    <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>
  );

  const columns: TableColumnsType<Audit> = [
    {
      title: 'Audit',
      dataIndex: 'name',
      render: (name: string, a) => (
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate">{name}</span>
          <span className="text-xs truncate" style={{ color: 'var(--color-gray-medium)' }}>
            {a.scope.join(' · ')}
          </span>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 190,
      render: (_: unknown, a) =>
        a.status === 'running' ? (
          <div className="flex items-center gap-2" style={{ maxWidth: 160 }}>
            <Progress
              percent={a.progress}
              size="small"
              strokeColor="var(--color-main)"
            />
          </div>
        ) : (
          <Tag color="default" style={{ borderRadius: 4 }}>
            Ready
          </Tag>
        ),
    },
    {
      title: 'Health',
      dataIndex: 'healthScore',
      width: 100,
      render: (score?: number) =>
        score != null ? (
          <span
            className="font-semibold tabular-nums"
            style={{ color: scoreColor(score) }}
          >
            {score}
            <span className="font-normal text-xs" style={{ color: 'var(--color-gray-medium)' }}>
              /100
            </span>
          </span>
        ) : (
          <span style={{ color: 'var(--color-gray-medium)' }}>—</span>
        ),
    },
    {
      title: 'Sample',
      dataIndex: 'sampleSize',
      width: 170,
      render: (n: number, a) => (
        <span className="tabular-nums text-sm">
          {n.toLocaleString()}{' '}
          <span style={{ color: 'var(--color-gray-medium)' }}>
            of {a.matched.toLocaleString()}
          </span>
        </span>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 170,
      render: (ts: number, a) => (
        <span className="text-sm" style={{ color: 'var(--color-gray-medium)' }}>
          {a.createdBy} ·{' '}
          {new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      title: 'Artifacts',
      key: 'artifacts',
      width: 120,
      render: (_: unknown, a) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip title={a.status === 'ready' ? 'Download PDF' : 'Available when ready'}>
            <Button
              type="text"
              size="small"
              disabled={a.status !== 'ready'}
              icon={<FileText size={15} />}
              aria-label="Download PDF"
              onClick={() => download('PDF')}
            />
          </Tooltip>
          <Tooltip title={a.status === 'ready' ? 'Download slides' : 'Available when ready'}>
            <Button
              type="text"
              size="small"
              disabled={a.status !== 'ready'}
              icon={<Presentation size={15} />}
              aria-label="Download slides"
              onClick={() => download('slides')}
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      align: 'center',
      render: (_: unknown, a) =>
        a.mine ? (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: 'delete',
                  icon: <Trash2 size={14} />,
                  label: 'Delete',
                  danger: true,
                },
              ],
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                if (key === 'delete') auditsStore.remove(a.id);
              },
            }}
          >
            <Button
              type="text"
              aria-label="Audit actions"
              icon={<EllipsisVertical size={16} />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        ) : null,
    },
  ];

  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      {/* header — same compact row as Issues / Tests */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">Audits</span>
          <Tooltip
            placement="bottom"
            title="Run a UX audit over a scope of your traffic: the agent reads a sample of sessions for behavioral friction — hesitation, repeated actions, abandoned steps — and produces a consulting-style report you can present or share."
          >
            <span className="flex items-center cursor-help" style={{ color: 'var(--color-gray-medium)' }}>
              <Info size={15} />
            </span>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://docs.openreplay.com/" target="_blank" rel="noreferrer">
            <Button type="text" icon={<Album size={14} />}>
              Docs
            </Button>
          </a>
        </div>
      </div>

      {/* controls bar — status tabs (left) + search & primary action (right) */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-wrap">
        <Segmented
          size="small"
          value={statusTab}
          onChange={(v) => setStatusTab(v as StatusTab)}
          options={[
            { value: 'all', label: <span>All{faded(audits.length)}</span> },
            { value: 'running', label: <span>Running{faded(runningCount)}</span> },
            { value: 'ready', label: <span>Ready{faded(readyCount)}</span> },
          ]}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Input.Search
            size="small"
            allowClear
            placeholder="Search audits"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 170 }}
          />
          <Button
            size="small"
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => setDrawerOpen(true)}
          >
            New audit
          </Button>
        </div>
      </div>

      <Table<Audit>
        rowKey="id"
        columns={columns}
        dataSource={visible}
        pagination={false}
        rowClassName="cursor-pointer"
        onRow={(a) => ({ onClick: () => openReport(a) })}
        locale={{
          emptyText: q
            ? 'No audits match your search.'
            : 'No audits yet — run one to get a consulting-style read on a slice of your traffic.',
        }}
      />

      <NewAuditDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

export default withPageTitle('Audits - OpenReplay')(observer(AuditsList));
