import React from 'react';
import { Button, Checkbox, Input, Tag } from 'antd';
import { MessageSquareQuote, X } from 'lucide-react';
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
const duration = new RegExp(/(\d{2}):(\d{2})/);

function HighlightPanel({ onClose, editNoteId }: { editNoteId: string; onClose: () => void }) {
  const { uiPlayerStore, notesStore, sessionStore } = useStore();
  const editNote = editNoteId ? notesStore.getNoteById(editNoteId) : undefined;
  const [message, setMessage] = React.useState(editNote?.message ?? '');
  const [isPublic, setIsPublic] = React.useState(editNote?.isPublic ?? false);
  const { store, player } = React.useContext(PlayerContext);
  const currentTime = store.get().time;

  const startTsStr = shortDurationFromMs(
    editNote?.startAt ?? uiPlayerStore.highlightSelection.startTs
  );
  const endTsStr = shortDurationFromMs(
    editNote?.endAt ?? uiPlayerStore.highlightSelection.endTs
  );
  const [startTs, setStartTs] = React.useState(startTsStr);
  const [endTs, setEndTs] = React.useState(endTsStr);
  const [tag, setTag] = React.useState(editNote?.tag ?? '');

  const onStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newState = maskDuration(e.target.value)
    setStartTs(newState);
    if (duration.test(newState)) {
      const [_, minutes, seconds] = duration.exec(newState) ?? [];
      const newTime = (parseInt(minutes) * 60 + parseInt(seconds))*1000;
      const sessLength = store.get().endTime;
      uiPlayerStore.toggleHighlightSelection({
        enabled: true,
        range: [Math.min(newTime, sessLength), uiPlayerStore.highlightSelection.endTs],
      })
    }
  };

  const onEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newState = maskDuration(e.target.value)
    setEndTs(newState);
    if (duration.test(newState)) {
      const [_, minutes, seconds] = duration.exec(newState) ?? [];
      const newTime = (parseInt(minutes) * 60 + parseInt(seconds))*1000;
      const sessLength = store.get().endTime;
      uiPlayerStore.toggleHighlightSelection({
        enabled: true,
        range: [uiPlayerStore.highlightSelection.startTs, Math.min(newTime, sessLength)],
      })
    }
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

  const onSave = async () => {
    try {
      notesStore.setSaving(true)
      const playerContainer = document.querySelector('iframe')?.contentWindow?.document.body;
      let thumbnail;
      if (playerContainer) {
        thumbnail = await elementToImage(playerContainer);
      }
      const note = {
        message,
        tag: tag,
        isPublic,
        timestamp: parseInt(currentTime, 10),
        startAt: parseInt(uiPlayerStore.highlightSelection.startTs, 10),
        endAt: parseInt(uiPlayerStore.highlightSelection.endTs, 10),
        thumbnail,
      }
      if (editNoteId) {
        await notesStore.updateNote(editNoteId, note);
        toast.success('Highlight updated');
      } else {
        const sessionId = sessionStore.current.sessionId;
        await notesStore.addNote(sessionId, note);
        toast.success('Highlight saved. Find it in Home > Highlights');
      }
      onClose();
    } catch (e) {
      toast.error('Failed to save highlight');
    } finally {
      notesStore.setSaving(false);
    }
  }

  return (
    <div
      className={'w-full p-4 flex flex-col gap-4'}
      style={{ width: 270 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={'flex items-center gap-2'}>
        <MessageSquareQuote size={16} strokeWidth={1.5} />
        <h3 className={'text-xl font-semibold'}>Highlight</h3>
        <div className={'cursor-pointer ml-auto'} onClick={onClose}>
          <X size={18} strokeWidth={2} />
        </div>
      </div>
      <div className='text-sm text-neutral-500'>
        Save key moments from sessions. Access them anytime on the ‘Highlights’
        page to share with your team.
      </div>
      <div>
        <Input.TextArea
          onChange={(e) => setMessage(e.target.value)}
          placeholder={'Enter Comments'}
          maxLength={200}
          rows={4}
          value={message}
        />
        <div className={'text-disabled-text text-sm'}>{message.length}/200 characters remaining</div>
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
      <div className={'flex items-center gap-1 flex-wrap'}>
        {TAGS.map((tag) => (
          <Tag
            onClick={() => addTag(tag)}
            key={tag}
            className="cursor-pointer rounded-lg hover:bg-indigo-50 mr-0"
            color={tagProps[tag]}
            bordered={false}
          >
            <div className={'flex items-center gap-1 text-sm'}>
              {tagActive(tag) ? (
                <Icon name="check-circle-fill" color="inherit" size={13} />
              ) : null}
              {tag}
            </div>
          </Tag>
        ))}
      </div>
      <div>
        <Checkbox
          onChange={(e) => setIsPublic(e.target.checked)}
          value={isPublic}
        >
          Visible to team members
        </Checkbox>
      </div>
      <div className={'flex items-center gap-2'}>
        <Button
          onClick={onSave}
          type={'primary'}
          disabled={message.length === 0}
          loading={notesStore.isSaving}
          icon={<MessageSquareQuote size={14} strokeWidth={1} />}
        >
          Save Highlight
        </Button>
        <Button
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
window.__debugElementToImage = (el) => elementToImage(el).then(img => {
  const a = document.createElement('a');
  a.href = img;
  a.download = 'highlight.png';
  a.click();
});

function elementToImage(el) {
  return import('html2canvas').then(({ default: html2canvas }) => {
    return html2canvas(
      el,
      {
        scale: 1,
        allowTaint: true,
        useCORS: false,
        logging: true,
        foreignObjectRendering: false,
        height: 900,
        width: 1200,
        x: 0,
        y: 0,
      }
    ).then((canvas) => {
      return canvas.toDataURL('img/png');
    }).catch(e => {
      console.log(e);
      return undefined
    });
  })
}

export default observer(HighlightPanel);
