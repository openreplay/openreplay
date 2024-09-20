import React, { useEffect } from 'react';
import { Icon } from 'UI';
import { Button } from 'antd';
import { connect } from 'react-redux';
import cn from 'classnames';
import stl from './SavedSearch.module.css';
import { useModal } from 'App/components/Modal';
import SavedSearchModal from './components/SavedSearchModal';
import { useStore } from 'App/mstore';

interface Props {

}

function SavedSearch(props: Props) {
  const { showModal } = useModal();
  const { searchStore, customFieldStore } = useStore();
  const savedSearch = searchStore.savedSearch;
  const list = searchStore.list;
  const fetchedMeta = customFieldStore.fetchedMetadata;

  useEffect(() => {
    if (list.size === 0 && fetchedMeta) {
      searchStore.fetchSavedSearchList(); // TODO check this call
    }
  }, [fetchedMeta]);

  return (
    <div className={cn('flex items-center', { [stl.disabled]: list.size === 0 })}>
      <Button
        // variant="outline"
        type="primary"
        ghost
        onClick={() => showModal(<SavedSearchModal />, { right: true, width: 450 })}
        className="flex gap-1"
      >
        <span className="mr-1">Saved Search</span>
        <span className="font-meidum">{list.size}</span>
        <Icon name="ellipsis-v" color="teal" size="14" />
      </Button>
      {savedSearch.exists() && (
        <div className="flex items-center ml-2">
          <Icon name="search" size="14" />
          <span className="color-gray-medium px-1">Viewing:</span>
          <span className="font-medium" style={{ whiteSpace: 'nowrap', width: '30%' }}>
            {savedSearch.name.length > 15 ? `${savedSearch.name.slice(0, 15)}...` : savedSearch.name}
          </span>
        </div>
      )}
    </div>
  );
}

export default connect((state: any) => ({}))(SavedSearch);
