import React from 'react';
import { PlayerContext } from 'Components/Session/playerContext';
import { Button, Input } from 'antd';
import { CopyButton } from 'UI';
import { SearchOutlined, ZoomInOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';

function TagWatch() {
  const [selector, setSelector] = React.useState('');
  const { store, player } = React.useContext(PlayerContext);

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

  return (
    <div className={'w-full h-full p-2 flex flex-col gap-2'}>
      <div className={'flex items-center justify-between'}>
        <div className={'font-semibold text-xl'}>Element Selector</div>
        <CopyButton content={selector} />
      </div>
      <Input.TextArea value={selector} onChange={(e) => setSelector(e.target.value)} />
      <Button type={'primary'} ghost icon={<ZoomInOutlined />}>
        Tag Element
      </Button>
      <div className={'text-disabled-text text-sm'}>
        Create and filter sessions by ‘watch elements’ to determine if they rendered or not.
      </div>
      <div className={'w-full border border-b-light-gray'} />
      <Button type={'link'} icon={<SearchOutlined />}>
        Find session with selector
      </Button>
    </div>
  );
}

export default observer(TagWatch);
