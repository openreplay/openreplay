import React, { useState } from "react";
import { Dropdown, Button } from 'antd';
import { MoreOutlined } from "@ant-design/icons";
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
      <div style={{ display: 'inline-flex' }}>
        <Button onClick={toggleModal} disabled={searchStore.instance.filters.length === 0} style={{ borderRadius: '0.5rem 0 0 0.5rem', borderRight: 0 }}>
          {savedSearch.exists() ? 'Update' : 'Save'} Search
        </Button>
        <Dropdown menu={{ items: options }} placement="bottomRight">
          <Button style={{ borderRadius: '0 0.5rem 0.5rem 0' }}>
            <MoreOutlined />
          </Button>
        </Dropdown>
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
