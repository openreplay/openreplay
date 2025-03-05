import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { MoreOutlined, SaveOutlined } from '@ant-design/icons';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useModal } from 'App/components/Modal';
import SaveSearchModal from '../SaveSearchModal/SaveSearchModal';
import SavedSearchModal from './components/SavedSearchModal';
import { useTranslation } from 'react-i18next';

function SavedSearch() {
  const [showModal, setShowModal] = useState(false);
  const { searchStore } = useStore();
  const { t } = useTranslation();

  const { showModal: showListModal } = useModal();

  const toggleModal = () => {
    if (searchStore.instance.filters.length === 0) return;
    setShowModal(true);
  };
  const isDisabled = searchStore.instance.filters.length === 0;

  const toggleList = () => {
    showListModal(<SavedSearchModal />, { right: true });
  };

  return (
    <>
      <div className="flex gap-2">
        <Tooltip
          title={
            searchStore.list.length === 0
              ? t('You have not saved any searches')
              : ''
          }
        >
          <Button
            disabled={searchStore.list.length === 0}
            onClick={toggleList}
            className="px-2"
            type="text"
          >
            {t('Saved Searches')}
          </Button>
        </Tooltip>

        <Tooltip
          title={
            isDisabled
              ? t('Add an event or filter to save search')
              : t('Save search filters')
          }
        >
          <Button
            onClick={toggleModal}
            disabled={isDisabled}
            className="px-2"
            type="text"
          >
            {/* {savedSearch.exists() ? 'Update' : 'Save'} Search */}
            <SaveOutlined />
          </Button>
        </Tooltip>
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
