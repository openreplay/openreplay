import { useDraggable } from '@neodrag/react';
import type { LocalStream } from 'Player';
import cn from 'classnames';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import Counter from 'App/components/shared/SessionItem/Counter';

import ChatControls from '../ChatControls/ChatControls';
import VideoContainer from '../components/VideoContainer';
import './call.css';

export interface Props {
  incomeStream: { stream: MediaStream; isAgent: boolean }[] | null;
  localStream: LocalStream | null;
  userId: string;
  isPrestart?: boolean;
  endCall: () => void;
}

function ChatWindow({
  userId,
  incomeStream,
  localStream,
  endCall,
  isPrestart,
}: Props) {
  const { t } = useTranslation();
  const dragRef = React.useRef<HTMLDivElement>(null);

  useDraggable(dragRef as React.RefObject<HTMLDivElement>, {
    bounds: 'body',
    defaultPosition: { x: 50, y: 200 },
  });
  const { player } = React.useContext(PlayerContext);

  // @ts-ignore exists in chat
  const { toggleVideoLocalStream } = player.assistManager;

  const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
  const [anyRemoteEnabled, setRemoteEnabled] = useState(false);

  const onlyLocalEnabled = localVideoEnabled && !anyRemoteEnabled;

  useEffect(() => {
    toggleVideoLocalStream(localVideoEnabled);
  }, [localVideoEnabled]);

  return (
    <div ref={dragRef}>
      <div className="m-call">
        <div className="handle m-call__head">
          <div className="m-call__title">
            <span className="m-call__who">
              {t('Call with')} {userId || t('Anonymous User')}
            </span>
            {incomeStream && incomeStream.length > 2 ? (
              <span className="m-call__more">
                {t('+ other agents in the call')}
              </span>
            ) : null}
          </div>
          <Counter startTime={new Date().getTime()} className="m-call__time" />
        </div>
        <div
          className="m-call__video"
          style={{ minHeight: onlyLocalEnabled ? 210 : 'unset' }}
        >
          {incomeStream ? (
            incomeStream.map((stream) => (
              <React.Fragment key={stream.stream.id}>
                <VideoContainer
                  stream={stream.stream}
                  setRemoteEnabled={setRemoteEnabled}
                  isAgent={stream.isAgent}
                />
              </React.Fragment>
            ))
          ) : (
            <div className="m-call__none">
              {t('Error obtaining incoming streams')}
            </div>
          )}
          <div
            className={cn(
              'absolute bottom-0 right-0 z-50',
              localVideoEnabled ? '' : 'hidden!',
            )}
          >
            <VideoContainer
              stream={localStream ? localStream.stream : null}
              muted
              height={anyRemoteEnabled ? 50 : 'unset'}
              local
            />
          </div>
        </div>
        <ChatControls
          videoEnabled={localVideoEnabled}
          setVideoEnabled={setLocalVideoEnabled}
          stream={localStream}
          endCall={endCall}
          isPrestart={isPrestart}
        />
      </div>
    </div>
  );
}

export default ChatWindow;
