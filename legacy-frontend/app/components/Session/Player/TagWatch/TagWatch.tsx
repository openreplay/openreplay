import { useStore } from 'App/mstore';
import SaveModal from 'Components/Session/Player/TagWatch/SaveModal';
import React from 'react';
import { PlayerContext } from 'Components/Session/playerContext';
import { Button, Input } from 'antd';
import { CopyButton } from 'UI';
import { SearchOutlined, ZoomInOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useModal } from 'App/components/Modal';
import { toast } from 'react-toastify';

function TagWatch() {
  const { tagWatchStore } = useStore();
  const [selector, setSelector] = React.useState('');
  const { store, player } = React.useContext(PlayerContext);
  const { showModal, hideModal } = useModal();

  const tagSelector = store.get().tagSelector;

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

  const onSave = async (name: string, ignoreClRage: boolean, ignoreDeadCl: boolean) => {
    try {
      const tag = await tagWatchStore.createTag({
        name,
        selector,
        ignoreClickRage: ignoreClRage,
        ignoreDeadClick: ignoreDeadCl,
      });
      // @ts-ignore
      toast.success('Tag created');
      setSelector('');
      return tag
    } catch {
      // @ts-ignore
      toast.error('Failed to create tag');
    }
  };
  const openSaveModal = () => {
    if (selector === '') {
      return;
    }
    showModal(<SaveModal onSave={onSave} hideModal={hideModal} />, { right: true, width: 400 });
  };
  return (
    <div className={'w-full h-full p-2 flex flex-col gap-2'}>
      <div className={'flex items-center justify-between'}>
        <div className={'font-semibold text-xl'}>Element Selector</div>
        <CopyButton content={selector} />
      </div>
      <Input.TextArea value={selector} onChange={(e) => setSelector(e.target.value)} />
      <Button
        onClick={openSaveModal}
        type={'primary'}
        ghost
        icon={<ZoomInOutlined />}
        disabled={selector === ''}
      >
        Tag Element
      </Button>
      <div className={'text-disabled-text text-sm'}>
        Create and filter sessions by ‘watch elements’ to determine if they rendered or not.
      </div>
    </div>
  );
}

export default observer(TagWatch);
