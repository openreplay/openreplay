import withPageTitle from '@/components/hocs/withPageTitle';
import { PlusOutlined } from '@ant-design/icons';
import withPermissions from 'HOCs/withPermissions';
import {
  Button,
  Empty,
  Switch,
  Table,
  type TableProps,
  Tag,
  Tooltip,
} from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { Lock, Users } from 'lucide-react';
import { DateTime } from 'luxon';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { sessions } from 'App/routes';
import SimpleEmptyImage from 'Components/DataManagement/SimpleEmptyImage';
import { CopyButton, TextEllipsis } from 'UI';

import FullPagination from 'Shared/FullPagination';

import ENV from '../../../../env';
import type { Segment } from './api';

type SortBy = 'name' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const columnKeyToSortBy: Record<string, SortBy> = {
  name: 'name',
};

// compact notation (matches the Events page): tables read in K, exact numbers
// live in the detail view
const numberFormatter = Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
});

function SegmentsList({
  list,
  page,
  onPageChange,
  onSortChange,
  limit,
  toSegment,
  toCreate,
  isPending,
  total,
  listLen,
}: {
  list: Segment[];
  page: number;
  limit: number;
  total: number;
  listLen: number;
  isPending: boolean;
  onPageChange: (page: number) => void;
  onSortChange: (field: SortBy, order: SortOrder) => void;
  toSegment: (id: string) => void;
  toCreate: () => void;
}) {
  const { t } = useTranslation();
  const { projectsStore, issuesStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const buildShareUrl = (id: string) =>
    `https://${ENV.ORIGIN}/${siteId}${sessions()}?sid=${id}`;

  const columns: TableProps<Segment>['columns'] = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      // one meta line replaces the old Conditions and Updated At columns —
      // creator (teammates' segments only) + relative update time
      render: (text: string, record: Segment) => {
        const s = issuesStore.segmentById(record.id);
        const rel = record.updatedAt
          ? DateTime.fromMillis(record.updatedAt).toRelative()
          : null;
        const meta = [
          s && !s.mine ? s.createdBy : null,
          rel ? t('updated {{rel}}', { rel }) : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <div className="flex flex-col">
            <TextEllipsis maxWidth={'320px'} text={text} className="link" />
            {meta && <span className="text-xs color-gray-medium">{meta}</span>}
          </div>
        );
      },
    },
    {
      title: t('Visibility'),
      key: 'visibility',
      render: (_: unknown, record: Segment) => (
        <div className="flex items-center gap-1">
          {/* @ts-ignore */}
          <Tooltip
            title={
              record.isPublic
                ? t('Visible to everyone on your team')
                : t('Only visible to its creator')
            }
          >
            <Tag
              icon={record.isPublic ? <Users size={12} /> : <Lock size={12} />}
              color="default"
              className="text-xs! px-2! py-0.5! m-0! whitespace-nowrap inline-flex! items-center! gap-1! cursor-help"
            >
              {record.isPublic ? t('Team') : t('Private')}
            </Tag>
          </Tooltip>
        </div>
      ),
    },
    {
      title: t('# Sessions'),
      dataIndex: 'sessionsCount',
      key: 'sessionsCount',
      render: (count: number) => numberFormatter.format(count ?? 0),
    },
    {
      title: t('# Users'),
      dataIndex: 'usersCount',
      key: 'usersCount',
      render: (count: number) => numberFormatter.format(count ?? 0),
    },
    {
      // the shared capture flag the Issues popover also toggles; only
      // team-visible segments are eligible (everyone must be able to stop one)
      title: t('Issues Agent'),
      key: 'capture',
      width: 110,
      render: (_: unknown, record: Segment) => {
        const s = issuesStore.segmentById(record.id);
        if (!s) return <span className="color-gray-medium">—</span>;
        const control = (
          <div onClick={(e) => e.stopPropagation()} className="inline-flex">
            <Switch
              size="small"
              checked={s.active}
              disabled={!s.isPublic}
              aria-label={`${s.name} — ${s.active ? t('on') : t('off')}`}
              onChange={(on) => {
                if (on) issuesStore.enableCapture(s.id);
                else if (issuesStore.toggleSegment(s.id, false))
                  toast.info(
                    t(
                      'No active segments left — capture switched to full traffic.',
                    ),
                  );
              }}
            />
          </div>
        );
        return s.isPublic ? (
          control
        ) : (
          <Tooltip
            title={t(
              'Private segments can’t enable the agent — only team-visible ones are eligible.',
            )}
          >
            {control}
          </Tooltip>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: Segment) => (
        <div onClick={(e) => e.stopPropagation()}>
          <CopyButton
            isIcon
            isShare
            content={buildShareUrl(record.id)}
            copyText={[t('Share Segment'), t('Link Copied!')]}
          />
        </div>
      ),
    },
  ];

  const handleTableChange: TableProps<Segment>['onChange'] = (
    _pagination,
    _filters,
    sorter,
  ) => {
    const s = sorter as SorterResult<Segment>;
    const field = columnKeyToSortBy[s.columnKey as string] ?? 'updatedAt';
    const order: SortOrder = s.order === 'ascend' ? 'asc' : 'desc';
    onSortChange(field, order);
  };

  const emptyState = (
    <Empty
      image={<SimpleEmptyImage />}
      description={
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="text-base font-medium">{t('No segments')}</div>
          <div className="text-disabled-text max-w-md">
            {t(
              'Segments are a reusable collection of events and filters that you can save and apply later to search for sessions.',
            )}
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={toCreate}
            className="mt-1"
          >
            {t('Create Segment')}
          </Button>
        </div>
      }
    />
  );

  return (
    <>
      <Table
        columns={columns}
        dataSource={list}
        pagination={false}
        scroll={{ x: 'max-content' }}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => toSegment(record.id),
        })}
        rowHoverable
        rowClassName={'cursor-pointer'}
        loading={isPending}
        onChange={handleTableChange}
        locale={{ emptyText: isPending ? null : emptyState }}
      />
      <FullPagination
        page={page}
        limit={limit}
        total={total}
        listLen={listLen}
        onPageChange={onPageChange}
        entity={'segments'}
      />
    </>
  );
}

export default withPageTitle('Segments')(
  withPermissions(
    ['DATA_MANAGEMENT'],
    '',
    false,
    false,
  )(observer(SegmentsList)),
);
