import withPageTitle from '@/components/hocs/withPageTitle';
import { useLast } from '@/lib/use-last';
import { useLocalSort } from '@/lib/use-local-sort';
import { useStore } from '@/mstore';
import { Button } from '@/ui/actions/button';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard } from '@/ui/layout/PageCard';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { sessions, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import type { Tag } from 'App/services/TagWatchService';

import '../data-management.css';
import { compact } from '../shared';
import TagForm from './TagForm';

const SORT: Record<string, (a: Tag, b: Tag) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  users: (a, b) => (a.users ?? 0) - (b.users ?? 0),
  volume: (a, b) => (a.volume ?? 0) - (b.volume ?? 0),
};

function TagsPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const { tagWatchStore, projectsStore } = useStore();
  const siteId = projectsStore.siteId;
  const list = tagWatchStore.tags;
  const [openId, setOpenId] = React.useState<number | null>(null);
  const open = list.find((x) => x.tagId === openId) ?? null;
  const shown = useLast(open);
  const { sort, onSort, sorted } = useLocalSort(list, SORT);

  useEffect(() => {
    void tagWatchStore.getTags(Number(siteId));
  }, [siteId]);

  const columns: Column<Tag>[] = [
    {
      title: t('Name'),
      key: 'name',
      width: '26%',
      sortable: true,
      render: (f) => <span className="m-truncate block">{f.name}</span>,
    },
    {
      title: t('Location'),
      key: 'location',
      width: '22%',
      render: (f) => (
        <span className="m-truncate m-dmg__mono block text-content-secondary">
          {f.location || '—'}
        </span>
      ),
    },
    {
      title: t('Selector'),
      key: 'selector',
      width: '30%',
      render: (f) => (
        <span className="m-truncate m-dmg__mono block text-content-secondary">
          {f.selector}
        </span>
      ),
    },
    {
      title: t('Users'),
      key: 'users',
      width: '11%',
      align: 'right',
      sortable: true,
      render: (f) => (
        <span className="m-dmg__mono">{compact.format(f.users ?? 0)}</span>
      ),
    },
    {
      title: t('Interactions'),
      key: 'volume',
      width: '11%',
      align: 'right',
      sortable: true,
      render: (f) => (
        <span className="m-dmg__mono">{compact.format(f.volume ?? 0)}</span>
      ),
    },
  ];

  return (
    <PageCard
      title={t('Features')}
      subtitle={t('Tagged elements and how often they are used.')}
    >
      {tagWatchStore.isLoading && list.length === 0 ? (
        <SkeletonRows rows={4} columns={[26, 22, 30, 11, 11]} />
      ) : list.length === 0 ? (
        <EmptyState
          art="features"
          title={t('No features yet')}
          hint={t(
            'A feature is an element you tagged in a replay: a button, a form, a step. Tag one, and from then on it is counted here.',
          )}
          action={
            <Button
              onClick={() => history.push(withSiteId(sessions(), siteId!))}
            >
              {t('Go to Sessions')}
            </Button>
          }
        />
      ) : (
        <>
          <DataTable<Tag>
            rowKey={(f) => String(f.tagId)}
            columns={columns}
            rows={sorted}
            sort={sort}
            onSort={onSort}
            onRowClick={(f) => setOpenId(f.tagId)}
            ariaLabel={t('Features')}
          />
          <ListFooter
            page={tagWatchStore.page}
            pageSize={tagWatchStore.limit}
            total={tagWatchStore.total}
            noun={[t('feature'), t('features')]}
            onPage={(p) => void tagWatchStore.getTags(Number(siteId), p)}
          />
        </>
      )}
      {shown && (
        <TagForm
          key={shown.tagId}
          tag={shown}
          open={open != null}
          onClose={() => setOpenId(null)}
          projectId={Number(siteId)}
        />
      )}
    </PageCard>
  );
}

export default withPageTitle('Features')(observer(TagsPage));
