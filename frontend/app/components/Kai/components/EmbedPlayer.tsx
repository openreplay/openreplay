import React from 'react';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { Loader } from 'UI';
import { observer } from 'mobx-react-lite';
import MobileClipsPlayer from 'App/components/Session/MobileClipsPlayer';
import ClipsPlayer from 'App/components/Session/ClipsPlayer';
import Session from '@/types/session/session';

interface Clip {
  sessionId: string | undefined;
  range: [number, number];
  message: string;
}

function EmbedPlayer({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const { projectsStore } = useStore();
  const clip = {
    sessionId: session.sessionId,
    range: [0, session.durationMs],
    message: '',
  };
  const { isMobile } = projectsStore;

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
          'rounded-sm shadow-sm boarder bg-white',
        )}
        style={{ width: 960 }}
      >
        {isMobile ? (
          <MobileClipsPlayer
            isHighlight
            onClose={onClose}
            clip={clip}
            currentIndex={0}
            isCurrent
            autoplay={false}
            isFull
          />
        ) : (
          <ClipsPlayer
            isHighlight
            onClose={onClose}
            clip={clip}
            currentIndex={0}
            isCurrent
            autoplay={false}
            isFull
          />
        )}
      </div>
    </div>
  );
}

export default observer(EmbedPlayer);
