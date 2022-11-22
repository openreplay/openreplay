import React from 'react';
import {
  connectPlayer,
} from 'Player';
import PlayerBlock from '../Session_/PlayerBlock';
import styles from '../Session_/session.module.css';
import { countDaysFrom } from 'App/date';
import cn from 'classnames';
import RightBlock from './RightBlock';

function PlayerContent({ session, live, fullscreen, activeTab, setActiveTab, hasError }) {
  const sessionDays = countDaysFrom(session.startedAt);
  return (
    <div className="relative">
      {hasError ? (
        <div
          className="inset-0 flex items-center justify-center absolute"
          style={{
            // background: '#f6f6f6',
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
              live={live}
            />
          )}
        </div>
      )}
    </div>
  );
}

function RightMenu({ live, tabs, activeTab, setActiveTab, fullscreen }) {
  return (
    !live &&
    !fullscreen && <RightBlock tabs={tabs} setActiveTab={setActiveTab} activeTab={activeTab} />
  );
}

export default connectPlayer((state) => ({
  showEvents: !state.showEvents,
  hasError: state.error,
}))(PlayerContent);
