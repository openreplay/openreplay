import React, { useState } from 'react';
import { Button, Tooltip, message, Space } from 'antd';
import { Save, Share2, List } from 'lucide-react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useModal } from 'App/components/Modal';
import SaveSearchModal from '../SaveSearchModal/SaveSearchModal';
import SavedSearchModal from './components/SavedSearchModal';
import { useTranslation } from 'react-i18next';

function SavedSearch() {
  const [showModal, setShowModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { searchStore, userStore } = useStore();
  const { t } = useTranslation();

  const { showModal: showListModal } = useModal();

  const isDisabled = searchStore.instance.filters.length === 0;
  const { savedSearch } = searchStore;
  const isUpdating = savedSearch.exists();
  const currentUserId = userStore.account.id;
  const isSharedSearch = savedSearch.exists() && String(savedSearch.userId) !== String(currentUserId);
  const isSaveDisabled = isDisabled || isSharedSearch;

  const toggleModal = () => {
    if (searchStore.instance.filters.length === 0) return;
    if (isSharedSearch) return;
    setShowModal(true);
  };

  const toggleList = () => {
    showListModal(<SavedSearchModal />, { right: true });
  };

  const handleShare = async () => {
    if (searchStore.instance.filters.length === 0) return;
    
    setIsSharing(true);
    try {
      // Save with isShare flag
      await searchStore.saveAsShare();
      
      const searchId = searchStore.savedSearch.searchId;
      if (searchId) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?sid=${searchId}`;
        await navigator.clipboard.writeText(shareUrl);
        message.success(t('Link copied to clipboard'));
      }
    } catch (error) {
      console.error('Failed to share search:', error);
      message.error(t('Failed to share search'));
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <div className="inline-flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">{t('Saved Searches')}</span>
        <Space.Compact>
          <Tooltip
            title={
              searchStore.list.length === 0
                ? t('You have not saved any searches')
                : t('View Saved Searches')
            }
          >
            <Button
              disabled={searchStore.list.length === 0}
              onClick={toggleList}
              icon={<List size={16} />}
              type="text"
              className="!px-2"
            />
          </Tooltip>

          <Tooltip
            title={
              isSharedSearch
                ? t('Cannot modify shared search')
                : isDisabled
                  ? t('Add an event or filter to save search')
                  : isUpdating
                    ? t('Update')
                    : t('Save Search')
            }
          >
            <Button
              onClick={toggleModal}
              disabled={isSaveDisabled}
              icon={<Save size={16} />}
              type="text"
              className="!px-2"
            />
          </Tooltip>

          <Tooltip title={isDisabled ? t('Add an event or filter to share search') : t('Share Search')}>
            <Button
              onClick={handleShare}
              disabled={isDisabled}
              loading={isSharing}
              icon={<Share2 size={16} />}
              type="text"
              className="!px-2"
            />
          </Tooltip>
        </Space.Compact>
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
