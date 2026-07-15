import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import withPermissions from 'HOCs/withPermissions';
import { Button, Input } from 'antd';
import { Album } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { SavedSegment } from 'App/components/SmartAlerts/api';
import SegmentDrawer from 'App/components/SmartAlerts/segments/SegmentDrawer';
import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { debounce } from 'App/utils';

import SegmentsList from './SegmentsList';
import { fetchSegments } from './api';

type SortBy = 'name' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

function SegmentsListPage() {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const { projectsStore, issuesStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const queryClient = useQueryClient();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavedSegment | null>(null);

  const limit = 10;
  const [page, setPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState<SortBy>('updatedAt');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');

  // load the capture layer so the list's Issues Agent column + creator meta
  // (both sourced from issuesStore.segmentById) are populated
  React.useEffect(() => {
    if (siteId) issuesStore.ensureSegments(String(siteId));
  }, [siteId]);

  const applySearch = React.useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedQuery(value);
        setPage(1);
      }, 400),
    [],
  );

  const onSearch = (value: string) => {
    setQuery(value);
    applySearch(value);
  };

  const { data = { segments: [], total: 0 }, isPending } = useQuery({
    queryKey: [
      'segments-list',
      siteId,
      page,
      limit,
      debouncedQuery,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      fetchSegments({
        limit,
        page,
        name: debouncedQuery || undefined,
        sortBy,
        sortOrder,
      }),
  });

  const onPageChange = (newPage: number) => {
    setPage(newPage);
  };
  const onSortChange = (field: SortBy, order: SortOrder) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['segments-list'] });
  };

  // create/edit happens in the shared slide-out (the same one Issues uses); the
  // full-page editor stays routed as a fallback when a row isn't in the loaded
  // capture set (e.g. beyond the fetch window)
  const toSegment = (id: string) => {
    const segment = issuesStore.segmentById(id);
    if (segment) {
      setEditing(segment);
      setDrawerOpen(true);
      return;
    }
    history.push(withSiteId(dataManagement.segmentPage(id), siteId!));
  };

  const toCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div
        className={
          'flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:justify-between border-b px-4 py-2'
        }
      >
        <div className="flex items-center gap-2">
          <div className={'font-semibold text-lg capitalize'}>
            {t('Segments')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://docs.openreplay.com/en/product-analytics/data-management/"
            target="_blank"
            rel="noreferrer"
          >
            <Button type="text" icon={<Album size={14} />}>
              {t('Docs')}
            </Button>
          </a>
          <Button
            icon={<PlusOutlined />}
            type="primary"
            size="small"
            onClick={toCreate}
          >
            {t('Create')}
          </Button>
          <div className="min-w-50 md:w-1/4 md:min-w-75">
            <Input.Search
              size={'small'}
              placeholder={t('Filter by name')}
              value={query}
              allowClear
              maxLength={256}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <SegmentsList
        list={data.segments}
        page={page}
        limit={limit}
        total={data.total}
        listLen={data.segments.length}
        isPending={isPending}
        onPageChange={onPageChange}
        onSortChange={onSortChange}
        toSegment={toSegment}
        toCreate={toCreate}
      />

      <SegmentDrawer
        open={drawerOpen}
        segment={editing}
        source="dm"
        onClose={() => setDrawerOpen(false)}
        onSaved={onSaved}
      />
    </div>
  );
}

export default withPermissions(
  ['DATA_MANAGEMENT'],
  '',
  false,
  false,
)(observer(SegmentsListPage));
