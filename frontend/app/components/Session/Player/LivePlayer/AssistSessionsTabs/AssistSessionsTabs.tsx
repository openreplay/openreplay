import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useHistory } from 'react-router-dom';
import { multiview, liveSession, withSiteId } from 'App/routes';
import { connect } from 'react-redux';
import { PlayerContext, ILivePlayerContext } from 'App/components/Session/playerContext';

interface ITab {
  onClick?: () => void;
  classNames?: string;
  children: React.ReactNode;
  style?: Record<string, any>;
  isDisabled?: boolean;
}

const Tab = (props: ITab) => (
  <div
    onClick={props.onClick}
    className={cn('p-1 rounded flex items-center justify-center', !props.isDisabled ? 'cursor-pointer' : 'cursor-not-allowed', props.classNames)}
    style={props.style}
  >
    {props.children}
  </div>
);

export const InactiveTab = React.memo((props: Omit<ITab, 'children'>) => (
  <Tab onClick={props.onClick} classNames={cn("hover:bg-gray-bg bg-gray-light", !props.isDisabled ? 'cursor-pointer' : 'cursor-not-allowed', props.classNames)}>
    <Icon name="plus" size="22" color="white" />
  </Tab>
));

const ActiveTab = React.memo((props: Omit<ITab, 'children'>) => (
  <Tab onClick={props.onClick} classNames="hover:bg-teal" style={{ background: 'rgba(57, 78, 255, 0.5)' }}>
    <Icon name="play-fill-new" size="22" color="white" />
  </Tab>
));

const CurrentTab = React.memo(() => (
  <Tab classNames="bg-teal color-white">
    <span style={{ fontSize: '0.65rem' }}>PLAYING</span>
  </Tab>
));

function AssistTabs({ session, siteId }: { session: Record<string, any>; siteId: string }) {
  const history = useHistory();
  const { store } = React.useContext(PlayerContext) as unknown as ILivePlayerContext
  const { recordingState, calling, remoteControl } = store.get()
  const isDisabled = recordingState !== 0 || calling !== 0 || remoteControl !== 0

  const { assistMultiviewStore } = useStore();

  const placeholder = new Array(4 - assistMultiviewStore.sessions.length).fill(0);

  React.useEffect(() => {
    if (assistMultiviewStore.sessions.length === 0) {
      assistMultiviewStore.setDefault(session);
    }
  }, []);

  const openGrid = () => {
    if (isDisabled) return;
    const sessionIdQuery = encodeURIComponent(assistMultiviewStore.sessions.map((s) => s.sessionId).join(','));
    return history.push(withSiteId(multiview(sessionIdQuery), siteId));
  };
  const openLiveSession = (sessionId: string) => {
    if (isDisabled) return;
    assistMultiviewStore.setActiveSession(sessionId);
    history.push(withSiteId(liveSession(sessionId), siteId));
  };

  return (
    <div className="grid grid-cols-2 w-28 h-full" style={{ gap: '4px', opacity: isDisabled ? 0.6 : 1, cursor: isDisabled ? 'not-allowed' : undefined }}>
      {assistMultiviewStore.sortedSessions.map((session: { key: number, sessionId: string }) => (
        <React.Fragment key={session.key}>
          {assistMultiviewStore.isActive(session.sessionId) ? (
            <CurrentTab />
          ) : (
            <ActiveTab isDisabled={isDisabled} onClick={() => openLiveSession(session.sessionId)} />
          )}
        </React.Fragment>
      ))}
      {placeholder.map((_, i) => (
        <React.Fragment key={i}>
          <InactiveTab isDisabled={isDisabled} onClick={openGrid} />
        </React.Fragment>
      ))}
    </div>
  );
}

export default connect((state: any) => ({ siteId: state.getIn(['site', 'siteId']) }))(
  observer(AssistTabs)
);
