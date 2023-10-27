import React from 'react';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import styles from 'Components/Session_/session.module.css';
import { countDaysFrom } from 'App/date';
import RightBlock from 'Components/Session/RightBlock';
import { PlayerContext } from 'Components/Session/playerContext';
import Session from 'Types/session'
import PlayerBlock from './PlayerBlock';

const TABS = {
  EVENTS: 'User Events',
  HEATMAPS: 'Click Map',
};

interface IProps {
  fullscreen: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: Session
}

function PlayerContent({ session, fullscreen, activeTab, setActiveTab }: IProps) {
  const { store } = React.useContext(PlayerContext)

  const {
    error,
  } = store.get()

  const hasError = !!error

  const sessionDays = countDaysFrom(session.startedAt);
  return (
    <div className="relative">
      {hasError ? (
        <div
          className="inset-0 flex items-center justify-center absolute"
          style={{
            height: 'calc(100vh - 50px)',
            zIndex: '999',
          }}
        >
          <div className="flex flex-col items-center">
            <div className="text-lg -mt-8">
              {sessionDays > 2 ? 'Session not found.' : 'This session is still being processed.'}
            </div>
            <div className="text-sm">
              {sessionDays > 2
                ? 'Please check your data retention policy.'
                : 'Please check it again in a few minutes.'}
            </div>
          </div>
        </div>
      ) : (
        <div className={cn('flex', { 'pointer-events-none': hasError })}>
          <div
            className="w-full"
            style={activeTab && !fullscreen ? { maxWidth: 'calc(100% - 270px)' } : undefined}
          >
            <div className={cn(styles.session, 'relative')} data-fullscreen={fullscreen}>
              <PlayerBlock activeTab={activeTab} />
            </div>
          </div>
          {activeTab !== '' && (
            <RightMenu
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              fullscreen={fullscreen}
              tabs={TABS}
            />
          )}
        </div>
      )}
    </div>
  );
}

function RightMenu({ tabs, activeTab, setActiveTab, fullscreen }: any) {
  return (
    !fullscreen ? <RightBlock tabs={tabs} setActiveTab={setActiveTab} activeTab={activeTab} /> : null
  );
}

export default observer(PlayerContent);
