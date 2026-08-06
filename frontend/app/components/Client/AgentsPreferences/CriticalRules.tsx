import { Button, Input, Modal, Segmented, Table, Tooltip, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { AlertTriangle, PencilIcon, Plus, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import type { CriticalRule } from 'App/mstore/issuesStore';
import { CriticalRuleFields } from 'Components/SmartAlerts/shared';

import CountSuffix from 'Shared/CountSuffix';

import { useConfirms } from './confirms';

/* "What's critical" — the centralized list: one description per line with its
   author, since the engine passes them to the LLM per-user and that is what
   makes "Critical to me" filterable. Your own rows edit/delete; a teammate's
   shows a disabled pencil naming who can change it. */

type Scope = 'all' | 'mine';

function CriticalRules() {
  const { t } = useTranslation();
  const { issuesStore } = useStore();
  const { confirmDelete } = useConfirms();

  const [scope, setScope] = React.useState<Scope>('all');
  const [q, setQ] = React.useState('');
  const [editing, setEditing] = React.useState<CriticalRule | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [desc, setDesc] = React.useState('');

  const all = issuesStore.criticalRules;
  const ql = q.trim().toLowerCase();
  const shown = all.filter(
    (r) =>
      (scope === 'all' || r.mine) &&
      (!ql ||
        r.description.toLowerCase().includes(ql) ||
        r.createdBy.toLowerCase().includes(ql)),
  );

  const openCreate = () => {
    setEditing(null);
    setDesc('');
    setDialogOpen(true);
  };
  const save = () => {
    const text = desc.trim();
    if (!text) return;
    if (editing) {
      issuesStore.updateCriticalRule(editing.id, text);
    } else {
      issuesStore.addCriticalRule(text);
      message.success(
        t('Saved. The agent applies it as it reviews new sessions.'),
      );
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const columns: TableColumnsType<CriticalRule> = [
    {
      title: t('What’s critical'),
      dataIndex: 'description',
      render: (d: string) => (
        <span className="flex items-start gap-2.5">
          <AlertTriangle
            size={15}
            className="mt-0.5 shrink-0"
            style={{ color: 'var(--color-red)' }}
          />
          {d}
        </span>
      ),
    },
    {
      title: t('Added by'),
      dataIndex: 'createdBy',
      width: 150,
      render: (name: string, row) => (
        <span style={{ color: 'var(--color-gray-dark)' }}>
          {row.mine ? t('You') : name}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 84,
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          {row.mine ? (
            <>
              <Button
                type="text"
                className="invisible group-hover:visible"
                icon={<PencilIcon size={16} />}
                aria-label={t('Edit')}
                onClick={() => {
                  setEditing(row);
                  setDesc(row.description);
                  setDialogOpen(true);
                }}
              />
              <Button
                type="text"
                danger
                className="invisible group-hover:visible"
                icon={<Trash2 size={16} />}
                aria-label={t('Delete')}
                onClick={() => {
                  const orphans = issuesStore.rulesOnlyMatch(row.id);
                  confirmDelete({
                    what: t('description'),
                    name: row.description,
                    consequence: orphans
                      ? t('{{count}} issue stops being critical for you.', {
                          count: orphans,
                        })
                      : t(
                          'No issue is currently critical because of it alone.',
                        ),
                    onOk: () => issuesStore.removeCriticalRule(row.id),
                  });
                }}
              />
            </>
          ) : (
            <Tooltip
              title={t('Only {{who}} can change this description.', {
                who: row.createdBy,
              })}
            >
              <span className="inline-flex">
                <Button
                  type="text"
                  disabled
                  className="invisible group-hover:visible"
                  icon={<PencilIcon size={16} />}
                  aria-label={t('Edit')}
                />
              </span>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col rounded-lg border bg-white">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-wrap">
        <Segmented
          size="small"
          value={scope}
          onChange={(v) => {
            setScope(v as Scope);
            setQ('');
          }}
          options={[
            {
              value: 'all',
              label: (
                <span>
                  {t('Everyone')}
                  <CountSuffix n={all.length} />
                </span>
              ),
            },
            {
              value: 'mine',
              label: (
                <span>
                  {t('Mine')}
                  <CountSuffix n={all.filter((r) => r.mine).length} />
                </span>
              ),
            },
          ]}
        />
        <div className="flex items-center gap-2">
          <Input.Search
            size="small"
            allowClear
            maxLength={256}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Filter by description or author')}
            style={{ width: 264 }}
          />
          <Button size="small" icon={<Plus size={14} />} onClick={openCreate}>
            {t('Add description')}
          </Button>
        </div>
      </div>

      <Table<CriticalRule>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={shown}
        pagination={false}
        rowClassName="group"
        locale={{
          emptyText: ql ? (
            t('Nothing matches “{{q}}”', { q: q.trim() })
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <AlertTriangle
                size={36}
                style={{ color: 'var(--color-gray-medium)' }}
              />
              <div className="text-center my-4">
                {scope === 'mine'
                  ? t(
                      'You have not described anything yet. Add one and the agent flags what matches, for you.',
                    )
                  : t('Nothing is described as critical yet.')}
              </div>
            </div>
          ),
        }}
      />

      <Modal
        title={editing ? t('Edit description') : t('What’s critical to you?')}
        open={dialogOpen}
        onCancel={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onOk={save}
        okText={editing ? t('Save') : t('Add description')}
        okButtonProps={{ disabled: !desc.trim() }}
      >
        <p className="mb-3" style={{ color: 'var(--color-gray-dark)' }}>
          {t(
            'Describe it in plain words. The agent reads your description and flags the issues that match, and only you can change it.',
          )}
        </p>
        <CriticalRuleFields
          autoFocus
          value={desc}
          onChange={setDesc}
          caption={t(
            'Applies as the agent reviews new sessions; issues already reviewed are not re-scanned.',
          )}
        />
      </Modal>
    </div>
  );
}

export default observer(CriticalRules);
