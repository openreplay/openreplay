import React, { MouseEvent, useState } from 'react';
import cn from 'classnames';
import { Icon, Input, confirm, Tooltip } from 'UI';
import { useModal } from 'App/components/Modal';
import { SavedSearch } from 'Types/ts/search';
import SaveSearchModal from 'Shared/SaveSearchModal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { ISavedSearch } from 'App/mstore/types/savedSearch';
import stl from './savedSearchModal.module.css';
import { useTranslation } from 'react-i18next';

interface ITooltipIcon {
  title: string;
  name: string;
  onClick: (e: MouseEvent<HTMLDivElement>) => void;
}

function TooltipIcon(props: ITooltipIcon) {
  return (
    <div onClick={(e) => props.onClick(e)}>
      <Tooltip title={props.title}>
        {/* @ts-ignore */}
        <Icon size="16" name={props.name} color="main" />
      </Tooltip>
    </div>
  );
}

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
  const onDelete = async (item: SavedSearch, e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const confirmation = await confirm({
      header: t('Confirm'),
      confirmButton: t('Yes, delete'),
      confirmation: t(
        'Are you sure you want to permanently delete this search?',
      ),
    });
    if (confirmation) {
      searchStore.removeSavedSearch(`${item.searchId}`);
    }
  };
  const onEdit = (item: SavedSearch, e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    searchStore.editSavedSearch(item);
    setTimeout(() => setshowModal(true), 0);
  };

  const shownItems = searchStore.list.filter((item) =>
    item.name.toLocaleLowerCase().includes(filterQuery.toLocaleLowerCase()),
  );

  return (
    <div className="bg-white box-shadow h-screen">
      <div className="p-6">
        <h1 className="text-2xl">
          {t('Saved Search')}{' '}
          <span className="color-gray-medium">{searchStore.list.length}</span>
        </h1>
      </div>
      {searchStore.list.length > 1 && (
        <div className="mb-6 w-full px-4">
          <Input
            icon="search"
            onChange={({ target: { value } }: any) => setFilterQuery(value)}
            placeholder={t('Filter by name')}
          />
        </div>
      )}
      <div style={{ maxHeight: 'calc(100vh - 106px)', overflowY: 'auto' }}>
        {shownItems.map((item) => (
          <div
            key={item.searchId}
            className={cn(
              'p-4 cursor-pointer border-b flex items-center group hover:bg-active-blue',
            )}
            onClick={(e) => onClick(item, e)}
          >
            <Icon name="search" color="gray-medium" size="16" />
            <div className="ml-4">
              <div className="text-lg">{item.name} </div>
              {item.isPublic && (
                <div
                  className={cn(
                    stl.iconContainer,
                    'color-gray-medium flex items-center px-2 mt-2',
                  )}
                >
                  <Icon name="user-friends" size="11" />
                  <div className="ml-1 text-sm">{t('Team')}</div>
                </div>
              )}
            </div>
            <div className="flex items-center ml-auto self-center">
              <div
                className={cn(
                  stl.iconCircle,
                  'mr-2 invisible group-hover:visible',
                )}
              >
                <TooltipIcon
                  name="pencil"
                  onClick={(e) => onEdit(item, e)}
                  title={t('Rename')}
                />
              </div>
              <div
                className={cn(stl.iconCircle, 'invisible group-hover:visible')}
              >
                <TooltipIcon
                  name="trash"
                  onClick={(e) => onDelete(item, e)}
                  title={t('Delete')}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <SaveSearchModal
          show
          closeHandler={() => setshowModal(false)}
          rename={false}
        />
      )}
    </div>
  );
}

export default observer(SavedSearchModal);
