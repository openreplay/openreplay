import { Button } from '@/ui/actions/button';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { SearchField } from '@/ui/inputs/SearchField';
import { Modal } from '@/ui/overlays/modal';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { AlertTriangle, PencilIcon, Plus, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import type { CriticalRule } from 'App/mstore/issuesStore';
import { CriticalRuleFields } from 'Components/SmartAlerts/shared';

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
  const toast = useToast();

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
      toast.success(
        t('Saved. The agent applies it as it reviews new sessions.'),
      );
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const columns: Column<CriticalRule>[] = [
    {
      title: t('What’s critical'),
      key: 'description',
      render: (row) => (
        <span className="flex items-start gap-2.5 text-sm text-content-primary">
          <AlertTriangle
            size={14}
            className="mt-0.5 shrink-0 text-content-danger"
          />
          {row.description}
        </span>
      ),
    },
    {
      title: t('Added by'),
      key: 'createdBy',
      width: 150,
      render: (row) => (
        <span className="text-sm text-content-secondary">
          {row.mine ? t('You') : row.createdBy}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 84,
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.mine ? (
            <>
              <Button
                variant="subtle"
                className="invisible group-hover:visible"
                aria-label={t('Edit')}
                onClick={() => {
                  setEditing(row);
                  setDesc(row.description);
                  setDialogOpen(true);
                }}
                size="icon"
              >
                <PencilIcon size={16} />
              </Button>
              <Button
                variant="danger-subtle"
                className="invisible group-hover:visible"
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
                size="icon"
              >
                <Trash2 size={16} />
              </Button>
            </>
          ) : (
            <Tooltip
              title={t('Only {{who}} can change this description.', {
                who: row.createdBy,
              })}
            >
              <span className="inline-flex">
                <Button
                  variant="subtle"
                  disabled
                  className="invisible group-hover:visible"
                  aria-label={t('Edit')}
                  size="icon"
                >
                  <PencilIcon size={16} />
                </Button>
              </span>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="m-prefcard">
      <div className="m-prefcard__bar">
        <FilterStrip
          label={t('Whose descriptions')}
          items={[
            { key: 'all', label: t('Everyone'), count: all.length },
            {
              key: 'mine',
              label: t('Mine'),
              count: all.filter((r) => r.mine).length,
            },
          ]}
          selected={[scope]}
          onSelect={(k) => {
            setScope(k as Scope);
            setQ('');
          }}
        />
        <span className="m-prefcard__actions">
          <SearchField
            placeholder={t('Filter by description or author')}
            value={q}
            onChange={setQ}
          />
          <Button onClick={openCreate}>
            <Plus size={14} />
            {t('Add description')}
          </Button>
        </span>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={
            ql
              ? t('Nothing matches “{{q}}”', { q: q.trim() })
              : scope === 'mine'
                ? t('You have not described anything yet')
                : t('Nothing is described as critical yet')
          }
          hint={
            ql
              ? undefined
              : t('Add one and the agent flags the issues that match, for you.')
          }
        />
      ) : (
        <DataTable<CriticalRule>
          ariaLabel={t('What’s critical')}
          columns={columns}
          rows={shown}
          rowKey={(r) => String(r.id)}
          rowClassName={() => 'group'}
        />
      )}

      <Modal
        title={editing ? t('Edit description') : t('What’s critical to you?')}
        open={dialogOpen}
        onCancel={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onOk={save}
        okText={editing ? t('Save') : t('Add description')}
        okDisabled={!desc.trim()}
      >
        <p className="m-dlg__lede">
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
