import { useStore } from 'App/mstore';
import SaveModal from 'Components/Session/Player/TagWatch/SaveModal';
import React from 'react';
import { PlayerContext } from 'Components/Session/playerContext';
import { Button, Input, Tooltip } from 'antd';
import { CopyOutlined, ZoomInOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useModal } from 'App/components/Modal';
import { toast } from 'react-toastify';
import { FilterKey } from 'App/types/filter/filterType';
import { addOptionsToFilter } from 'App/types/filter/newFilter';
import { useTranslation } from 'react-i18next';

interface CopyableTextAreaProps {
  selector: string;
  setSelector: (value: string) => void;
}

const CopyableTextArea: React.FC<CopyableTextAreaProps> = ({
  selector,
  setSelector,
}) => {
  const { t } = useTranslation();
  const handleCopy = () => {
    navigator.clipboard.writeText(selector);
  };

  return (
    <div className="w-full relative">
      <Input.TextArea
        value={selector}
        onChange={(e) => setSelector(e.target.value)}
        className="rounded-lg font-mono text-sm  placeholder:font-sans placeholder:text-base placeholder:text-gray-400"
        rows={4}
        style={{ paddingRight: '40px' }}
        placeholder={t('Enter selector to tag elements. E.g. .btn-primary')}
      />
      <Tooltip title={t('Copy')}>
        <Button
          type="text"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 1,
          }}
        />
      </Tooltip>
    </div>
  );
};

function TagWatch() {
  const { t } = useTranslation();
  const { tagWatchStore, searchStore } = useStore();
  const [selector, setSelector] = React.useState('');
  const { store, player } = React.useContext(PlayerContext);
  const { showModal, hideModal } = useModal();

  const { tagSelector } = store.get();

  React.useEffect(() => {
    player.pause();
    player.toggleInspectorMode(true);
    player.scale();

    return () => {
      player.toggleInspectorMode(false);
      player.scale();
    };
  }, []);

  React.useEffect(() => {
    if (tagSelector !== '' && tagSelector !== selector) {
      setSelector(tagSelector);
    }
  }, [tagSelector]);

  React.useEffect(() => {
    if (selector !== tagSelector) {
      player.markBySelector(selector);
    }
  }, [selector]);

  const onSave = async (
    name: string,
    ignoreClRage: boolean,
    ignoreDeadCl: boolean,
  ) => {
    try {
      const tag = await tagWatchStore.createTag({
        name,
        selector,
        ignoreClickRage: ignoreClRage,
        ignoreDeadClick: ignoreDeadCl,
      });
      const tags = await tagWatchStore.getTags();
      if (tags) {
        addOptionsToFilter(
          FilterKey.TAGGED_ELEMENT,
          tags.map((tag) => ({ label: tag.name, value: tag.tagId.toString() })),
        );
        searchStore.refreshFilterOptions();
      }
      toast.success('Tag created');
      setSelector('');
      return tag;
    } catch {
      toast.error('Failed to create tag');
    }
  };

  const openSaveModal = () => {
    if (selector === '') {
      return;
    }
    showModal(<SaveModal onSave={onSave} hideModal={hideModal} />, {
      right: true,
      width: 400,
    });
  };

  return (
    <div className="w-full h-full p-4 flex flex-col gap-2">
      <div className="flex flex-col items-center justify-between">
        <p>
          {t(
            'Select elements in the session play area to tag by class selector and filter sessions to verify their rendering.',
          )}
        </p>
      </div>

      <CopyableTextArea selector={selector} setSelector={setSelector} />

      <Button
        onClick={openSaveModal}
        type="primary"
        ghost
        icon={<ZoomInOutlined />}
        disabled={selector === ''}
      >
        {t('Tag Element')}
      </Button>
    </div>
  );
}

export default observer(TagWatch);
