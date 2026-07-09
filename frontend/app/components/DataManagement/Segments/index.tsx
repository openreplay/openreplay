import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import withPermissions from 'HOCs/withPermissions';
import { Button, Input, Tabs } from 'antd';
import { Album } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import type { SavedSegment } from 'App/mstore/issuesStore';
import { dataManagement, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { debounce } from 'App/utils';
import SegmentDrawer from 'Components/Issues/segments/SegmentDrawer';

import SegmentsList from './SegmentsList';
import TrafficSegmentsTab from './TrafficSegmentsTab';
import { fetchSegments } from './api';

/* Segments home (Mehdi 07-07, Data Management integration):
   · tab menu — Session segments (the classic saved-search list) / Traffic
     segments (capture management, same set the Issues popover drives);
   · create/edit happens in the shared SegmentDrawer (the same slide-out used
     in Issues — instructions only exist there); the old full-page editor
     stays routed but nothing links to it anymore.
   In the mock demo the list is the shared issuesStore dataset, so a segment
   created from Issues appears here immediately; outside mock the session tab
   keeps its original API path. */

const IS_MOCK = process.env.MOCK === '1';

type SortBy = 'name' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

/** shape a SavedSegment like the API's Segment for the existing table */
const toRow = (s: SavedSegment) => ({
  id: String(s.id),
  name: s.name,
  isPublic: s.isPublic,
  // the mock account id is '1'; any other value = a teammate's segment
  userId: s.mine ? 1 : 900 + s.id,
  filters: s.seeds,
  sessionsCount: s.sessionsCount,
  usersCount: s.usersCount,
  updatedAt: s.updatedAt,
  createdAt: s.updatedAt,
});

function SegmentsListPage() {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const { projectsStore, issuesStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();

  const [tab, setTab] = React.useState<'session' | 'traffic'>('session');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavedSegment | null>(null);

  const limit = 10;
  const [page, setPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState<SortBy>('updatedAt');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');

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

  const { data: apiData = { segments: [], total: 0 }, isPending } = useQuery({
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
    enabled: !IS_MOCK,
  });

  // mock path: the shared store, filtered/sorted/paged client-side with the
  // exact same controls the API path uses
  const q = debouncedQuery.trim().toLowerCase();
  const sign = sortOrder === 'asc' ? 1 : -1;
  const mockAll = issuesStore.visibleSegments
    .filter((s) => !q || s.name.toLowerCase().includes(q))
    .slice()
    .sort((a, b) =>
      sortBy === 'name'
        ? a.name.localeCompare(b.name) * sign
        : (a.updatedAt - b.updatedAt) * sign,
    );
  const data = IS_MOCK
    ? {
        segments: mockAll
          .slice((page - 1) * limit, page * limit)
          .map(toRow) as any[],
        total: mockAll.length,
      }
    : apiData;

  const onPageChange = (newPage: number) => {
    setPage(newPage);
  };
  const onSortChange = (field: SortBy, order: SortOrder) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  const openSegment = (segment: SavedSegment) => {
    setEditing(segment);
    setDrawerOpen(true);
  };

  const toSegment = (id: string) => {
    if (IS_MOCK) {
      const segment = issuesStore.segmentById(Number(id));
      if (segment) openSegment(segment);
      return;
    }
    history.push(withSiteId(dataManagement.segmentPage(id), siteId!));
  };

  const toCreate = () => {
    if (IS_MOCK) {
      setEditing(null);
      setDrawerOpen(true);
      return;
    }
    history.push(withSiteId(dataManagement.segmentPage('new'), siteId!));
  };

  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className={'flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:justify-between border-b px-4 py-2'}>
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

      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as 'session' | 'traffic')}
        tabBarStyle={{ paddingLeft: 16, paddingRight: 16, marginBottom: 0 }}
        items={[
          {
            key: 'session',
            label: t('Session segments'),
            children: (
              <SegmentsList
                list={data.segments}
                page={page}
                limit={limit}
                total={data.total}
                listLen={data.segments.length}
                isPending={IS_MOCK ? false : isPending}
                onPageChange={onPageChange}
                onSortChange={onSortChange}
                toSegment={toSegment}
                toCreate={toCreate}
              />
            ),
          },
          {
            key: 'traffic',
            label: t('Traffic segments'),
            children: (
              <TrafficSegmentsTab query={debouncedQuery} onOpen={openSegment} />
            ),
          },
        ]}
      />

      <SegmentDrawer
        open={drawerOpen}
        segment={editing}
        source="dm"
        onClose={() => setDrawerOpen(false)}
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
