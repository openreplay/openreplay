import React, { useState } from "react";
import { Dropdown } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import SaveSearchModal from "../SaveSearchModal/SaveSearchModal";

function SavedSearch() {
  const [showModal, setShowModal] = useState(false);
  const { searchStore } = useStore();
  const savedSearch = searchStore.savedSearch;

  const options = searchStore.list.map((item) => ({
    key: item.searchId,
    label: item.name,
    onClick: () => searchStore.applySavedSearch(item)
  }))

  const toggleModal = () => {
    if (searchStore.instance.filters.length === 0) return;
    setShowModal(true);
  }
  return (
    <>
    <Dropdown.Button onClick={toggleModal} menu={{ items: options }} className={'w-fit'}>
      {savedSearch.exists() ? 'Update' : 'Save'} Search
    </Dropdown.Button>
      {showModal && (
        <SaveSearchModal
          show={showModal}
          closeHandler={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default observer(SavedSearch);
