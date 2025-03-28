import React, { useState, useEffect } from 'react';
import cn from 'classnames';
import Counter from 'App/components/shared/SessionItem/Counter';
import { useDraggable } from '@neodrag/react';
import type { LocalStream } from 'Player';
import { PlayerContext } from 'App/components/Session/playerContext';
import ChatControls from '../ChatControls/ChatControls';
import stl from './chatWindow.module.css';
import VideoContainer from '../components/VideoContainer';
import { useTranslation } from 'react-i18next';

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
  useDraggable(dragRef, { bounds: 'body', defaultPosition: { x: 50, y: 200 } })
  const { player } = React.useContext(PlayerContext);

  const { toggleVideoLocalStream } = player.assistManager;

  const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
  const [anyRemoteEnabled, setRemoteEnabled] = useState(false);

  const onlyLocalEnabled = localVideoEnabled && !anyRemoteEnabled;

  useEffect(() => {
    toggleVideoLocalStream(localVideoEnabled);
  }, [localVideoEnabled]);

  return (
    <div ref={dragRef}>
      <div
        className={cn(stl.wrapper, 'fixed radius bg-white shadow-xl mt-16')}
        style={{ width: '280px' }}
      >
        <div className="handle flex items-center p-2 cursor-move select-none border-b">
          <div className={stl.headerTitle}>
            <b>{t('Call with')}&nbsp;</b> {userId || t('Anonymous User')}
            <br />
            {incomeStream && incomeStream.length > 2
              ? t(' (+ other agents in the call)')
              : ''}
          </div>
          <Counter
            startTime={new Date().getTime()}
            className="text-sm ml-auto"
          />
        </div>
        <div
          className={cn(stl.videoWrapper, 'relative')}
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
            <div className={stl.noVideo}>
              {t('Error obtaining incoming streams')}
            </div>
          )}
          <div
            className={cn(
              'absolute bottom-0 right-0 z-50',
              localVideoEnabled ? '' : '!hidden',
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
