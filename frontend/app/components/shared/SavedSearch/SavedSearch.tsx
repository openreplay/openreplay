import React, { useState } from "react";
import { Button } from 'antd';
import { MoreOutlined } from "@ant-design/icons";
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import SaveSearchModal from "../SaveSearchModal/SaveSearchModal";
import SavedSearchModal from "./components/SavedSearchModal";
import { useModal } from 'App/components/Modal';

function SavedSearch() {
  const [showModal, setShowModal] = useState(false);
  const { searchStore } = useStore();
  const savedSearch = searchStore.savedSearch;

  const { showModal: showListModal } = useModal();

  const toggleModal = () => {
    if (searchStore.instance.filters.length === 0) return;
    setShowModal(true);
  }

  const toggleList = () => {
    showListModal(<SavedSearchModal />, { right: true });
  }
  return (
    <>
      <div style={{ display: 'inline-flex' }}>
        <Button onClick={toggleModal} disabled={searchStore.instance.filters.length === 0} style={{ borderRadius: '0.5rem 0 0 0.5rem', borderRight: 0 }}>
          {savedSearch.exists() ? 'Update' : 'Save'} Search
        </Button>
        <Button disabled={searchStore.list.length === 0} onClick={toggleList} style={{ borderRadius: '0 0.5rem 0.5rem 0' }}>
          <MoreOutlined />
        </Button>
      </div>
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
