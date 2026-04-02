import withPageTitle from '@/components/hocs/withPageTitle';
import { useStore } from '@/mstore';
import { Input, Table } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { Tag } from 'App/services/TagWatchService';
import { useModal } from 'Components/ModalContext';
import { TextEllipsis } from 'UI';

import FullPagination from 'Shared/FullPagination';

import TagForm from './TagForm';

function TagsPage() {
  const { t } = useTranslation();
  const { tagWatchStore, projectsStore } = useStore();
  const list = tagWatchStore.tags;
  const { openModal } = useModal();
  const siteId = projectsStore.siteId;

  useEffect(() => {
    void tagWatchStore.getTags(Number(siteId));
  }, [siteId]);

  const onPageChange = (page: number) => {
    void tagWatchStore.getTags(Number(siteId), page);
  };

  const handleEdit = (tag?: any) => {
    openModal(<TagForm tag={tag} projectId={Number(siteId)} />, {
      title: tag ? t('Edit Feature') : t('Add Feature'),
    });
  };

  const numberFormatter = Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  });

  const columns = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Tag, b: Tag) => a.name.localeCompare(b.name),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (text: string) => (
        <TextEllipsis maxWidth={'200px'} text={text} className="link" />
      ),
    },
    {
      title: t('Location'),
      dataIndex: 'location',
      key: 'location',
      render: (text: string | null) =>
        text ? (
          <TextEllipsis maxWidth={'250px'} text={text} />
        ) : (
          <span className="text-disabled-text">—</span>
        ),
    },
    {
      title: t('Selector'),
      dataIndex: 'selector',
      key: 'selector',
      render: (text: string) => <TextEllipsis maxWidth={'300px'} text={text} />,
    },
    {
      title: t('Users'),
      dataIndex: 'users',
      key: 'users',
      sorter: (a: Tag, b: Tag) => (a.users ?? 0) - (b.users ?? 0),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (val: number) => <span>{numberFormatter.format(val ?? 0)}</span>,
    },
    {
      title: t('Interactions'),
      dataIndex: 'volume',
      key: 'volume',
      sorter: (a: Tag, b: Tag) => (a.volume ?? 0) - (b.volume ?? 0),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (val: number) => <span>{numberFormatter.format(val ?? 0)}</span>,
    },
  ];

  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:justify-between border-b px-4 py-2">
        <div className="font-semibold text-lg capitalize">{t('Features')}</div>
        <div className="flex items-center gap-2">
          {/* <div className="min-w-50 md:w-1/4 md:min-w-75">
            <Input.Search
              size="small"
              placeholder={t('Filter by name')}
              allowClear
              maxLength={256}
              disabled
            />
          </div> */}
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={list}
        pagination={false}
        scroll={{ x: 'max-content' }}
        onRow={(record) => ({
          onClick: () => handleEdit(record),
        })}
        rowHoverable
        rowClassName="cursor-pointer"
        loading={tagWatchStore.isLoading}
        rowKey="tagId"
      />
      <FullPagination
        page={tagWatchStore.page}
        limit={tagWatchStore.limit}
        total={tagWatchStore.total}
        listLen={list.length}
        onPageChange={onPageChange}
        entity="features"
      />
    </div>
  );
}

export default withPageTitle('Features')(observer(TagsPage));
