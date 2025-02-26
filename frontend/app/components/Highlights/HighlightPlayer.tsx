import React from 'react';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { Loader } from 'UI';
import { observer } from 'mobx-react-lite';
import MobileClipsPlayer from '../Session/MobileClipsPlayer';
import ClipsPlayer from '../Session/ClipsPlayer';

interface Clip {
  sessionId: string | undefined;
  range: [number, number];
  message: string;
}

function HighlightPlayer({
  hlId,
  onClose,
}: {
  hlId: string;
  onClose: () => void;
}) {
  const { notesStore, projectsStore } = useStore();
  const [clip, setClip] = React.useState<Clip>({
    sessionId: undefined,
    range: [],
    message: '',
  });
  const { isMobile } = projectsStore;

  React.useEffect(() => {
    if (hlId) {
      notesStore.fetchNoteById(hlId).then((hl) => {
        if (!hl) {
          onClose();
        } else {
          setClip({
            range: [hl.startAt ?? 0, hl.endAt ?? 99999],
            sessionId: hl.sessionId,
            message: hl.message,
          });
        }
      });
    }
  }, [hlId]);

  const onBgClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  return (
    <div
      className="w-screen h-screen fixed top-0 left-0 flex items-center justify-center"
      style={{ zIndex: 100, background: 'rgba(0,0,0, 0.15)' }}
      onClick={onBgClick}
    >
      <div
        className={cn(
          'rounded-lg overflow-hidden',
          'rounded shadow boarder bg-white',
        )}
        style={{ width: 960 }}
      >
        <Loader loading={notesStore.loading}>
          {isMobile ? (
            <MobileClipsPlayer
              isHighlight
              onClose={onClose}
              clip={clip}
              currentIndex={0}
              isCurrent
              autoplay={false}
            />
          ) : (
            <ClipsPlayer
              isHighlight
              onClose={onClose}
              clip={clip}
              currentIndex={0}
              isCurrent
              autoplay={false}
            />
          )}
        </Loader>
      </div>
    </div>
  );
}

export default observer(HighlightPlayer);
