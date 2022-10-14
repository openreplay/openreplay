import React, { useState, useEffect } from 'react';
import VideoContainer from '../components/VideoContainer';
import cn from 'classnames';
import Counter from 'App/components/shared/SessionItem/Counter';
import stl from './chatWindow.module.css';
import ChatControls from '../ChatControls/ChatControls';
import Draggable from 'react-draggable';
import type { LocalStream } from 'Player/MessageDistributor/managers/LocalStream';
import { toggleVideoLocalStream } from 'Player'

export interface Props {
  incomeStream: MediaStream[] | null;
  localStream: LocalStream | null;
  userId: string;
  isPrestart?: boolean;
  endCall: () => void;
}

function ChatWindow({ userId, incomeStream, localStream, endCall, isPrestart }: Props) {
  const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
  const [anyRemoteEnabled, setRemoteEnabled] = useState(false);

  const onlyLocalEnabled = localVideoEnabled && !anyRemoteEnabled;

  useEffect(() => {
    toggleVideoLocalStream(localVideoEnabled)
  }, [localVideoEnabled])

  return (
    <Draggable handle=".handle" bounds="body" defaultPosition={{ x: 50, y: 200 }}>
      <div
        className={cn(stl.wrapper, 'fixed radius bg-white shadow-xl mt-16')}
        style={{ width: '280px' }}
      >
        <div className="handle flex items-center p-2 cursor-move select-none border-b">
          <div className={stl.headerTitle}>
            <b>Call with </b> {userId ? userId : 'Anonymous User'}
            <br />
            {incomeStream && incomeStream.length > 2 ? ' (+ other agents in the call)' : ''}
          </div>
          <Counter startTime={new Date().getTime()} className="text-sm ml-auto" />
        </div>
        <div
          className={cn(stl.videoWrapper, 'relative')}
          style={{ minHeight: onlyLocalEnabled ? 210 : 'unset' }}
        >
          {incomeStream ? (
            incomeStream.map((stream) => (
              <React.Fragment key={stream.id}>
                <VideoContainer stream={stream} setRemoteEnabled={setRemoteEnabled} />
              </React.Fragment>
            ))
          ) : (
            <div className={stl.noVideo}>Error obtaining incoming streams</div>
          )}
          <div className={cn('absolute bottom-0 right-0 z-50', localVideoEnabled ? '' : '!hidden')}>
            <VideoContainer
              stream={localStream ? localStream.stream : null}
              muted
              height={anyRemoteEnabled ? 50 : 'unset'}
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
    </Draggable>
  );
}

export default ChatWindow;
