import { Button } from '@/ui/actions/button';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { SearchField } from '@/ui/inputs/SearchField';
import { ListFooter } from '@/ui/layout/ListFooter';
import { useToast } from '@/ui/overlays/toast';
import { PencilIcon, Plus, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import type { JourneyTag } from 'App/mstore/issuesStore';
import { TagDialog } from 'Components/SmartAlerts/shared';

import { useConfirms } from './confirms';

/* The journey-tag manager. Predefined tags can be renamed/removed like any
   other, so `source` is provenance, not permission — every row edits/deletes. */

type SourceKey = 'openreplay' | 'yours';
const PAGE_SIZE = 10;

function JourneyTags() {
  const { t } = useTranslation();
  const { issuesStore } = useStore();
  const { confirmDelete } = useConfirms();

  const toast = useToast();
  const [source, setSource] = React.useState<SourceKey>('openreplay');
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<JourneyTag | null>(null);

  const rows =
    source === 'openreplay'
      ? issuesStore.predefinedTags
      : issuesStore.customTags;
  const ql = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      !ql ||
      r.name.toLowerCase().includes(ql) ||
      r.description.toLowerCase().includes(ql),
  );
  // client-side paging over the filtered set; clamp so deleting the last row on
  // a page doesn't strand the view on an empty page
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = shown.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // keyed on id, not name, so renaming a tag's casing isn't read as a clash
  const nameTaken = (name: string, exceptId?: number) =>
    issuesStore.journeyTags.some(
      (x) => x.name.toLowerCase() === name.toLowerCase() && x.id !== exceptId,
    );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const saveTag = (name: string, description: string) => {
    if (nameTaken(name, editing?.id)) {
      // the dialog stays open so the name can be fixed in place
      toast.info(t('A tag called “{{name}}” already exists.', { name }));
      return;
    }
    if (editing) {
      issuesStore.updateTag(editing.id, name, description);
    } else {
      // the store refuses the write when it can't reach the project — never
      // report success for something that didn't happen
      if (!issuesStore.addCustomTag(name, description)) {
        toast.error(t('Couldn’t create the tag. Please try again.'));
        return;
      }
      // a tag you author is yours, so show the side it landed on
      setSource('yours');
      setPage(1);
      toast.success(
        t('Tag created. The agent starts applying it to new sessions.'),
      );
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const columns: Column<JourneyTag>[] = [
    {
      title: t('Name'),
      key: 'name',
      width: 190,
      render: (row) => (
        <span className="text-sm font-medium text-content-primary">
          {row.name}
        </span>
      ),
    },
    {
      title: t('Description'),
      key: 'description',
      render: (row) => (
        <span className="text-sm text-content-secondary">
          {row.description}
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
          <Button
            variant="subtle"
            className="invisible group-hover:visible"
            aria-label={t('Edit')}
            onClick={() => {
              setEditing(row);
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
            onClick={() =>
              confirmDelete({
                what: t('tag'),
                name: row.name,
                consequence: t(
                  'The agent stops applying it to new sessions; sessions already tagged keep it.',
                ),
                onOk: () => issuesStore.removeTag(row.id),
              })
            }
            size="icon"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="m-prefcard">
      <div className="m-prefcard__bar">
        <FilterStrip
          label={t('Whose tags')}
          items={[
            {
              key: 'openreplay',
              label: t('By OpenReplay'),
              count: issuesStore.predefinedTags.length,
            },
            {
              key: 'yours',
              label: t('Mine'),
              count: issuesStore.customTags.length,
            },
          ]}
          selected={[source]}
          onSelect={(k) => {
            setSource(k as SourceKey);
            setQ('');
            setPage(1);
          }}
        />
        <span className="m-prefcard__actions">
          <SearchField
            placeholder={t('Filter by name or description')}
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
          <Button onClick={openCreate}>
            <Plus size={14} />
            {t('Add tag')}
          </Button>
        </span>
      </div>

      {pageRows.length === 0 ? (
        <EmptyState
          title={
            ql
              ? t('No tags match “{{q}}”', { q: q.trim() })
              : source === 'yours'
                ? t('No tags of your own yet')
                : t('No tags left in OpenReplay’s set')
          }
          hint={
            ql
              ? undefined
              : source === 'yours'
                ? t(
                    'Add one and describe the journey in plain words; the agent applies it automatically.',
                  )
                : t('Your own tags still apply.')
          }
        />
      ) : (
        <DataTable<JourneyTag>
          ariaLabel={t('Journey tags')}
          columns={columns}
          rows={pageRows}
          rowKey={(r) => String(r.id)}
          rowClassName={() => 'group'}
        />
      )}

      {shown.length > PAGE_SIZE && (
        <ListFooter
          page={safePage}
          pageSize={PAGE_SIZE}
          total={shown.length}
          noun={[t('tag'), t('tags')]}
          onPage={setPage}
        />
      )}

      <TagDialog
        open={dialogOpen}
        initial={editing}
        onCancel={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={saveTag}
      />
    </div>
  );
}

export default observer(JourneyTags);
