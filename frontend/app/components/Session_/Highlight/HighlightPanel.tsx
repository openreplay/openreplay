import React from 'react';
import { Button, Checkbox, Input, Tag } from 'antd';
import { MessageSquare, SquareMousePointer, X } from 'lucide-react';
import { TAGS, iTag, tagProps } from 'App/services/NotesService';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import { PlayerContext } from 'Components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { shortDurationFromMs } from 'App/date';
import { toast } from 'react-toastify';

function maskDuration(input: string): string {
  const digits = input.replace(/\D/g, '');

  const limitedDigits = digits.slice(0, 4);

  if (limitedDigits.length <= 2) {
    return limitedDigits;
  }

  return `${limitedDigits.slice(0, 2)}:${limitedDigits.slice(2)}`;
}

function HighlightPanel({ onClose }: { onClose: () => void }) {
  const { uiPlayerStore } = useStore();
  const { store, player } = React.useContext(PlayerContext);
  const currentTime = store.get().time;
  const startTsStr = shortDurationFromMs(
    uiPlayerStore.highlightSelection.startTs
  );
  const endTsStr = shortDurationFromMs(uiPlayerStore.highlightSelection.endTs);
  const [startTs, setStartTs] = React.useState(startTsStr);
  const [endTs, setEndTs] = React.useState(endTsStr);
  const [tag, setTag] = React.useState('');

  const onStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartTs(maskDuration(e.target.value));
  };

  const onEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndTs(maskDuration(e.target.value));
  };

  const playing = store.get().playing;

  React.useEffect(() => {
    player.pause();
    const time = store.get().time;
    const endTime = store.get().endTime;
    const distance = endTime / 50;
    uiPlayerStore.toggleHighlightSelection({
      enabled: true,
      range: [Math.max(time - distance, 0), Math.min(time + distance, endTime)],
    });
    return () => {
      uiPlayerStore.toggleHighlightSelection({
        enabled: false,
      });
    };
  }, []);
  React.useEffect(() => {
    const startStr = shortDurationFromMs(
      uiPlayerStore.highlightSelection.startTs
    );
    const endStr = shortDurationFromMs(uiPlayerStore.highlightSelection.endTs);
    setStartTs(startStr);
    setEndTs(endStr);
  }, [
    uiPlayerStore.highlightSelection.startTs,
    uiPlayerStore.highlightSelection.endTs,
  ]);
  React.useEffect(() => {
    player.pause();
  }, [playing]);

  const addTag = (newTag: iTag) => {
    setTag(newTag);
  };
  const tagActive = (checkedTag: iTag) => {
    return tag === checkedTag;
  };

  const onSave = () => {
    toast.success('Highlight saved');
    onClose();
  }

  return (
    <div
      className={'w-full p-4 flex flex-col gap-4'}
      style={{ width: 270 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={'flex items-center gap-2'}>
        <MessageSquare size={16} strokeWidth={1} />
        <h3 className={'text-xl font-semibold'}>Highlight</h3>
        <div className={'cursor-pointer ml-auto'} onClick={onClose}>
          <X size={18} strokeWidth={2} />
        </div>
      </div>
      <div>
        Save key moments from sessions. Access them anytime on the ‘Highlights’
        page to share with your team.
      </div>
      <div className={'flex items-center gap-2'}>
        <div>
          <div className={'font-semibold'}>From</div>
          <Input value={startTs} onChange={onStartChange} />
        </div>
        <div>
          <div className={'font-semibold'}>To</div>
          <Input value={endTs} onChange={onEndChange} />
        </div>
      </div>
      <div>
        <div className={'flex items-center gap-2'}>
          <div className={'font-semibold'}>Add Note</div>
          <Checkbox>at {shortDurationFromMs(currentTime)}</Checkbox>
        </div>
        <Input.TextArea placeholder={'Enter Comments'} />
      </div>
      <div className={'flex items-center gap-1 flex-wrap'}>
        {TAGS.map((tag) => (
          <Tag
            onClick={() => addTag(tag)}
            key={tag}
            className="cursor-pointer rounded-lg hover:bg-indigo-50"
            color={tagProps[tag]}
            bordered={false}
          >
            <div className={'flex items-center gap-1'}>
              {tagActive(tag) ? (
                <Icon name="check-circle-fill" color="inherit" size={13} />
              ) : null}
              {tag}
            </div>
          </Tag>
        ))}
      </div>
      <div>
        <Checkbox>Visible to team members</Checkbox>
      </div>
      <div className={'flex items-center gap-2'}>
        <Button
          onClick={onSave}
          type={'primary'}
          icon={<SquareMousePointer size={14} strokeWidth={1} />}
        >
          Save Highlight
        </Button>
        <Button
          onClick={onSave}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default observer(HighlightPanel);
