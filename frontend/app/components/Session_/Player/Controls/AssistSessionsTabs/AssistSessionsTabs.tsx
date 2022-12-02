import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useHistory } from 'react-router-dom';
import { multiview, liveSession, withSiteId } from 'App/routes';
import { connect } from 'react-redux';

interface ITab {
  onClick?: () => void;
  classNames?: string;
  children: React.ReactNode;
}

const Tab = (props: ITab) => (
  <div
    onClick={props.onClick}
    className={cn('p-1 rounded flex items-center justify-center cursor-pointer', props.classNames)}
  >
    {props.children}
  </div>
);

const InactiveTab = (props: Omit<ITab, 'children'>) => (
  <Tab onClick={props.onClick} classNames="hover:bg-gray-bg bg-gray-light">
    <Icon name="plus" size="22" color="white" />
  </Tab>
);
const ActiveTab = (props: Omit<ITab, 'children'>) => (
  <Tab onClick={props.onClick} classNames="hover:bg-teal bg-borderColor-primary">
    <Icon name="play-fill-new" size="22" color="white" />
  </Tab>
);
const CurrentTab = () => (
  <Tab classNames="bg-teal color-white">
    <span style={{ fontSize: '0.65rem' }}>PLAYING</span>
  </Tab>
);

function AssistTabs({ session, siteId }: { session: Record<string, any>; siteId: string }) {
  const history = useHistory();
  const { assistMultiviewStore } = useStore();

  const placeholder = new Array(4 - assistMultiviewStore.sessions.length).fill(0);

  React.useEffect(() => {
    if (assistMultiviewStore.sessions.length === 0) {
      assistMultiviewStore.setDefault(session);
    }
  }, []);

  const openGrid = () => {
    history.push(withSiteId(multiview(), siteId));
  };
  const openLiveSession = (sessionId: string) => {
    assistMultiviewStore.setActiveSession(sessionId);
    history.push(withSiteId(liveSession(sessionId), siteId));
  };

  console.log(assistMultiviewStore.activeSessionId)
  return (
    <div className="grid grid-cols-2 w-28 h-full" style={{ gap: '4px' }}>
      {assistMultiviewStore.sortedSessions.map((session) => (
        <React.Fragment key={session.key}>
          {assistMultiviewStore.isActive(session.sessionId) ? (
            <CurrentTab />
          ) : (
            <ActiveTab onClick={() => openLiveSession(session.sessionId)} />
          )}
        </React.Fragment>
      ))}
      {placeholder.map((_, i) => (
        <React.Fragment key={i}>
          <InactiveTab onClick={openGrid} />
        </React.Fragment>
      ))}
    </div>
  );
}

export default connect((state: any) => ({ siteId: state.getIn(['site', 'siteId']) }))(
  observer(AssistTabs)
);
