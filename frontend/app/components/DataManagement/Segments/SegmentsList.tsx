import withPageTitle from '@/components/hocs/withPageTitle';
import { PlusOutlined } from '@ant-design/icons';
import withPermissions from 'HOCs/withPermissions';
import { Button, Empty, Table, type TableProps, Tag, Tooltip } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { Lock, Star, Users } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { sessions } from 'App/routes';
import { CopyButton, TextEllipsis } from 'UI';

import FullPagination from 'Shared/FullPagination';

import ENV from '../../../../env';

import type { Segment } from './api';

type SortBy = 'name' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const columnKeyToSortBy: Record<string, SortBy> = {
  name: 'name',
  updatedAt: 'updatedAt',
};

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
  const { projectsStore, userStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const currentUserId = userStore.account.id;
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
      render: (text: string) => (
        <TextEllipsis maxWidth={'320px'} text={text} className="link" />
      ),
    },
    {
      title: t('Visibility'),
      key: 'visibility',
      render: (_: unknown, record: Segment) => {
        const isOwner =
          record.userId !== undefined &&
          String(record.userId) === String(currentUserId);
        return (
          <div className="flex items-center gap-1">
            {/* @ts-ignore */}
            <Tooltip
              title={
                record.isPublic
                  ? t('Visible to everyone on your team')
                  : t('Only visible to the segment owner')
              }
            >
              <Tag
                icon={
                  record.isPublic ? <Users size={12} /> : <Lock size={12} />
                }
                color="default"
                className="text-xs! px-2! py-0.5! m-0! whitespace-nowrap inline-flex! items-center! gap-1! cursor-help"
              >
                {record.isPublic ? t('Team') : t('Private')}
              </Tag>
            </Tooltip>
            {isOwner && (
              // @ts-ignore
              <Tooltip title={t("You're this segment's owner")}>
                <Tag
                  icon={<Star size={12} />}
                  color="gold"
                  className="text-xs! px-2! py-0.5! m-0! whitespace-nowrap inline-flex! items-center! gap-1! cursor-help"
                >
                  {t('Owner')}
                </Tag>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: t('Conditions'),
      dataIndex: 'filters',
      key: 'complexity',
      render: (filters: any[]) => (filters ? filters.length : 0),
    },
    {
      title: t('Updated At'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      sorter: true,
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (text: number) =>
        text ? new Date(text).toLocaleDateString() : '—',
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
      image={Empty.PRESENTED_IMAGE_SIMPLE}
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
  withPermissions(['DATA_MANAGEMENT'], '', false, false)(observer(SegmentsList)),
);
