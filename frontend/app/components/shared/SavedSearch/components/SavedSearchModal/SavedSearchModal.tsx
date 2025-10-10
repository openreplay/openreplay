import React, { MouseEvent, useState } from 'react';
import cn from 'classnames';
import { List, Input, Modal, Tooltip, Typography, Badge, Button } from 'antd';
import { Search, Edit2, Trash2, Users } from 'lucide-react';
import { useModal } from 'App/components/Modal';
import { SavedSearch } from 'Types/ts/search';
import SaveSearchModal from 'Shared/SaveSearchModal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { ISavedSearch } from 'App/mstore/types/savedSearch';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;

function SavedSearchModal() {
  const { hideModal } = useModal();
  const [showModal, setshowModal] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const { searchStore } = useStore();
  const { t } = useTranslation();

  const onClick = (item: ISavedSearch, e: any) => {
    e.stopPropagation();
    searchStore.applySavedSearch(item);
    hideModal();
  };
  const onDelete = (item: SavedSearch, e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    Modal.confirm({
      title: t('Confirm'),
      content: t('Are you sure you want to permanently delete this search?'),
      okText: t('Yes, delete'),
      cancelText: t('Cancel'),
      okButtonProps: { danger: true },
      onOk: () => {
        searchStore.removeSavedSearch(`${item.searchId}`);
      },
    });
  };
  const onEdit = (item: SavedSearch, e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    searchStore.editSavedSearch(item);
    setTimeout(() => setshowModal(true), 0);
  };

  const shownItems = searchStore.list.filter((item) =>
    item.name?.toLocaleLowerCase().includes(filterQuery.toLocaleLowerCase()),
  );

  return (
    <div className="bg-white shadow-lg h-screen flex flex-col">
      <div className="p-6 border-b">
        <Title level={3} className="!mb-0">
          {t('Saved Search')}{' '}
          <Badge count={searchStore.list.length} showZero className="ml-2" />
        </Title>
      </div>
      {searchStore.list.length > 1 && (
        <div className="p-6 pt-4">
          <Input
            prefix={<Search size={16} className="text-gray-400" />}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={t('Filter by name')}
            allowClear
          />
        </div>
      )}
      <List
        style={{ maxHeight: 'calc(100vh - 106px)', overflowY: 'auto' }}
        dataSource={shownItems}
        rowKey={(item) => item.searchId?.toString() || ''}
        renderItem={(item) => {
          const isActive = searchStore.savedSearch.searchId === item.searchId;
          return (
            <List.Item
              className={cn(
                'cursor-pointer group hover:bg-active-blue px-6 py-4 [&_.ant-list-item-action]:invisible [&:hover_.ant-list-item-action]:visible',
                { 'bg-active-blue': isActive }
              )}
              onClick={(e) => onClick(item, e)}
              actions={[
                <Tooltip key="edit" title={t('Rename')}>
                  <Button
                    type="text"
                    icon={<Edit2 size={16} />}
                    onClick={(e: any) => onEdit(item, e)}
                    className="!text-blue-600 hover:!bg-blue-50"
                  />
                </Tooltip>,
                <Tooltip key="delete" title={t('Delete')}>
                  <Button
                    type="text"
                    icon={<Trash2 size={16} />}
                    onClick={(e: any) => onDelete(item, e)}
                    className="!text-red-600 hover:!bg-red-50"
                  />
                </Tooltip>
              ]}
            >
              <List.Item.Meta
                className="!items-center"
                avatar={
                  <div className={cn("flex items-center justify-center w-10 h-10 rounded-full self-center ml-4", 
                    isActive ? "bg-teal-100" : "bg-gray-100"
                  )}>
                    <Search size={16} className={isActive ? "text-teal-600" : "text-gray-500"} />
                  </div>
                }
                title={
                  <div className={cn("text-base leading-tight flex items-center", { 'font-semibold': isActive })}>
                    {item.name}
                  </div>
                }
                description={
                  item.isPublic && (
                    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 mt-1">
                      <Users size={12} className="text-gray-600" />
                      <span className="text-xs text-gray-600">{t('Team')}</span>
                    </div>
                  )
                }
              />
            </List.Item>
          );
        }}
      />
      {showModal && (
        <SaveSearchModal
          show
          closeHandler={() => setshowModal(false)}
          rename={true}
        />
      )}
    </div>
  );
}

export default observer(SavedSearchModal);
