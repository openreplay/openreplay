import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import { countDaysFrom } from 'App/date';
import RightBlock from 'Components/Session/RightBlock';
import { PlayerContext } from 'Components/Session/playerContext';
import Session from 'Types/session';
import PlayerBlock from './PlayerBlock';
import { mobileScreen } from 'App/utils/isMobile';

interface IProps {
  fullscreen: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: Session;
}

function PlayerContent({
  session,
  fullscreen,
  activeTab,
  setActiveTab,
}: IProps) {
  const { store } = React.useContext(PlayerContext);

  const { error, completed } = store.get();
  const fullView = React.useMemo(() => new URLSearchParams(location.search).get('fullview') === 'true', []);

  React.useEffect(() => {
    if (completed) {
      console.log('PING:SESSION_ENDED');
    }
  }, [completed]);

  const hasError = !!error;

  const sessionDays = countDaysFrom(session.startedAt);
  return hasError ? (
    <div
      className="inset-0 flex items-center justify-center absolute"
      style={{
        // background: '#f6f6f6',
        height: 'calc(100dvh - 50px)',
        zIndex: '999',
      }}
    >
      <div className="flex flex-col items-center">
        <div className="text-lg -mt-8">
          {sessionDays > 2
            ? 'Session not found.'
            : 'This session is still being processed.'}
        </div>
        <div className="text-sm">
          {sessionDays > 2
            ? 'Please check your data retention policy.'
            : 'Please check it again in a few minutes.'}
        </div>
        {error ? <div style={{ opacity: 0 }}>{error}</div> : null}
      </div>
    </div>
  ) : (
    <div
      className={cn('relative flex h-full', {
        'pointer-events-none': hasError,
      })}
      style={{
        height: `calc(100dvh - ${mobileScreen ? '26px' : '50px'})`,
      }}
    >
      <div
        className="w-full h-full"
        style={
          activeTab && !fullscreen
            ? {
                maxWidth: `calc(100% - ${activeTab === 'EXPORT' ? '360px' : '270px'})`,
              }
            : undefined
        }
      >
        <div className={'relative flex h-full'} data-fullscreen={fullscreen}>
          <PlayerBlock
            setActiveTab={setActiveTab}
            activeTab={activeTab}
            fullView={fullView}
          />
        </div>
      </div>
      {!fullscreen && activeTab !== '' ? (
        <RightBlock setActiveTab={setActiveTab} activeTab={activeTab} />
      ) : null}
    </div>
  );
}

export default observer(PlayerContent);
