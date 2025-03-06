import React from 'react';
import { Button, Checkbox, Input, Tag } from 'antd';
import { X } from 'lucide-react';
import { TAGS, iTag, tagProps } from 'App/services/NotesService';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import { PlayerContext } from 'Components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { shortDurationFromMs } from 'App/date';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

function maskDuration(input: string): string {
  const digits = input.replace(/\D/g, '');

  const limitedDigits = digits.slice(0, 4);

  if (limitedDigits.length <= 2) {
    return limitedDigits;
  }

  return `${limitedDigits.slice(0, 2)}:${limitedDigits.slice(2)}`;
}
const duration = new RegExp(/(\d{2}):(\d{2})/);

function HighlightPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { uiPlayerStore, notesStore, sessionStore } = useStore();
  const { editNote } = notesStore;
  const [message, setMessage] = React.useState(editNote?.message ?? '');
  const [isPublic, setIsPublic] = React.useState(editNote?.isPublic ?? false);
  const { store, player } = React.useContext(PlayerContext);
  const currentTime = store.get().time;

  const startTsStr = shortDurationFromMs(
    editNote?.startAt ?? uiPlayerStore.highlightSelection.startTs,
  );
  const endTsStr = shortDurationFromMs(
    editNote?.endAt ?? uiPlayerStore.highlightSelection.endTs,
  );
  const [startTs, setStartTs] = React.useState(startTsStr);
  const [endTs, setEndTs] = React.useState(endTsStr);
  const [tag, setTag] = React.useState(editNote?.tag ?? TAGS[0]);

  const onStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newState = maskDuration(e.target.value);
    setStartTs(newState);
    if (duration.test(newState)) {
      const [_, minutes, seconds] = duration.exec(newState) ?? [];
      const newTime = (parseInt(minutes) * 60 + parseInt(seconds)) * 1000;
      const sessLength = store.get().endTime;
      uiPlayerStore.toggleHighlightSelection({
        enabled: true,
        range: [
          Math.min(newTime, sessLength),
          uiPlayerStore.highlightSelection.endTs,
        ],
      });
    }
  };

  const onEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newState = maskDuration(e.target.value);
    setEndTs(newState);
    if (duration.test(newState)) {
      const [_, minutes, seconds] = duration.exec(newState) ?? [];
      const newTime = (parseInt(minutes) * 60 + parseInt(seconds)) * 1000;
      const sessLength = store.get().endTime;
      uiPlayerStore.toggleHighlightSelection({
        enabled: true,
        range: [
          uiPlayerStore.highlightSelection.startTs,
          Math.min(newTime, sessLength),
        ],
      });
    }
  };

  const { playing } = store.get();

  React.useEffect(() => {
    player.pause();
    const { time } = store.get();
    const { endTime } = store.get();
    const distance = Math.max(endTime / 40, 2500);
    uiPlayerStore.toggleHighlightSelection({
      enabled: true,
      range: [Math.max(time - distance, 0), Math.min(time + distance, endTime)],
    });
    return () => {
      uiPlayerStore.toggleHighlightSelection({
        enabled: false,
      });
      notesStore.setEditNote(null);
    };
  }, []);
  React.useEffect(() => {
    const startStr = shortDurationFromMs(
      uiPlayerStore.highlightSelection.startTs,
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
  const tagActive = (checkedTag: iTag) => tag === checkedTag;

  const onSave = async () => {
    try {
      notesStore.setSaving(true);
      const playerContainer =
        document.querySelector('iframe')?.contentWindow?.document;
      let thumbnail;
      if (playerContainer) {
        thumbnail = await elementToCanvas(playerContainer);
        if (!thumbnail) {
          thumbnail = await elementToImage(thumbnail);
        }
      }
      const note = {
        message,
        tag,
        isPublic,
        timestamp: parseInt(currentTime, 10),
        startAt: parseInt(uiPlayerStore.highlightSelection.startTs, 10),
        endAt: parseInt(uiPlayerStore.highlightSelection.endTs, 10),
        thumbnail,
      };
      if (editNote) {
        await notesStore.updateNote(editNote.noteId, note);
        toast.success(t('Highlight updated'));
      } else {
        const { sessionId } = sessionStore.current;
        await notesStore.addNote(sessionId, note);
        toast.success(t('Highlight saved. Find it in Home > Highlights'));
      }
      onClose();
    } catch (e) {
      toast.error(t('Failed to save highlight'));
    } finally {
      notesStore.setSaving(false);
    }
  };

  return (
    <div
      className="w-full p-4 flex flex-col gap-4"
      style={{ width: 270 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <Icon name="chat-square-quote" color="inherit" size={16} />
        <h3 className="text-xl font-semibold">
          {editNote ? t('Edit ') : ''}
          {t('Highlight')}
        </h3>
        <div className="cursor-pointer ml-auto" onClick={onClose}>
          <X size={18} strokeWidth={2} />
        </div>
      </div>
      <div className="text-sm text-neutral-500">
        {t(
          'Save key moments from sessions. Access them anytime on the ‘Highlights’ page to share with your team.',
        )}
      </div>
      <div>
        <Input.TextArea
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter Comments"
          maxLength={200}
          rows={6}
          value={message}
          className="rounded-lg"
          autoFocus
        />
        <div className="text-disabled-text text-sm">
          {message.length}
          {t('/200 characters remaining')}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div>
          <div className="font-semibold">{t('From')}</div>
          <Input
            value={startTs}
            onChange={onStartChange}
            className="rounded-lg"
          />
        </div>
        <div>
          <div className="font-semibold">{t('To')}</div>
          <Input value={endTs} onChange={onEndChange} className="rounded-lg" />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {TAGS.map((tag) => (
          <Tag
            onClick={() => addTag(tag)}
            key={tag}
            className="cursor-pointer rounded-lg hover:bg-indigo-50 mr-0"
            color={tagProps[tag]}
            bordered={false}
          >
            <div className="flex items-center gap-1 text-sm">
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
          className="ms-2"
        >
          {t('Visible to team members')}
        </Checkbox>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={onSave}
          type="primary"
          loading={notesStore.isSaving}
          className="font-medium"
        >
          <Icon name="chat-square-quote" color="inherit" size={14} />{' '}
          {editNote ? t('Update') : t('Save')}&nbsp;
          {t('Highlight')}
        </Button>
        <Button onClick={onClose} type="text" className="font-medium">
          {t('Cancel')}
        </Button>
      </div>
    </div>
  );
}
window.__debugElementToImage = (el) =>
  elementToImage(el).then((img) => {
    const a = document.createElement('a');
    a.href = img;
    a.download = 'highlight.png';
    a.click();
  });

async function elementToImage(el: any) {
  const constraints = {
    video: {
      displaySurface: 'browser',
      preferCurrentTab: true,
    },
    preferCurrentTab: true,
    monitorTypeSurfaces: 'exclude',
    audio: false,
  };
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const bitmap = await imageCapture.grabFrame();
    track.stop();
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (e) {
    toast.error('Failed to capture screen image');
  }
}

function elementToCanvas(doc: Document) {
  const el = doc.body;
  const srcMap = new WeakMap<HTMLImageElement, string>();
  return import('@codewonders/html2canvas').then(({ default: html2canvas }) => {
    const images = doc.querySelectorAll('img');
    images.forEach((img) => {
      const sameOrigin =
        new URL(img.src, location.href).origin === location.origin;
      if (!sameOrigin) {
        srcMap.set(img, img.src);
        img.src = '';
      }
    });
    return html2canvas(el, {
      scale: 1,
      allowTaint: false,
      foreignObjectRendering: true,
      useCORS: true,
      logging: true,
    })
      .then((canvas) => {
        images.forEach((img) => {
          if (srcMap.has(img)) img.src = srcMap.get(img)!;
        });
        return canvas.toDataURL('image/png');
      })
      .catch((e) => {
        console.log(e);
        return undefined;
      });
  });
}

const convertAllImagesToBase64 = (proxyURL, cloned) => {
  const pendingImagesPromises = [];
  const pendingPromisesData = [];

  const images = cloned.getElementsByTagName('img');

  for (let i = 0; i < images.length; i += 1) {
    const promise = new Promise((resolve, reject) => {
      pendingPromisesData.push({
        index: i,
        resolve,
        reject,
      });
    });
    pendingImagesPromises.push(promise);
  }

  for (let i = 0; i < images.length; i += 1) {
    fetch(`${proxyURL}?url=${images[i].src}`)
      .then((response) => response.json())
      .then((data) => {
        const pending = pendingPromisesData.find((p) => p.index === i);
        images[i].src = data;
        pending.resolve(data);
      })
      .catch((e) => {
        const pending = pendingPromisesData.find((p) => p.index === i);
        pending.reject(e);
      });
  }

  return Promise.all(pendingImagesPromises);
};

export default observer(HighlightPanel);
