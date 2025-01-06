import React from 'react';
import { Dropdown } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function SavedSearch() {
  const { searchStore } = useStore();
  const savedSearch = searchStore.savedSearch;

  const options = searchStore.list.map((item) => ({
    key: item.searchId,
    label: item.name,
    onClick: () => searchStore.applySavedSearch(item)
  }))

  return (
    <Dropdown.Button menu={{ items: options }} className={'w-fit'}>
      {savedSearch.exists() ? 'Update' : 'Save'} Search
    </Dropdown.Button>
  );
}

export default observer(SavedSearch);
