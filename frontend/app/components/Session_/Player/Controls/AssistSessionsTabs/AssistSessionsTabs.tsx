import React from 'react';
import cn from 'classnames';
import { useModal } from 'App/components/Modal';
import { Icon } from 'UI';
import AssistSessionsModal from '../AssistSessionsModal';
import { useStore } from 'App/mstore'
import Session from 'App/mstore/types/session'
import { observer } from 'mobx-react-lite'

interface ITab {
  onClick?: () => void;
  onDoubleClick?: () => void;
  classNames?: string;
  children: React.ReactNode;
}

const Tab = (props: ITab) => (
  <div
    onDoubleClick={props.onDoubleClick}
    onClick={props.onClick}
    className={cn('p-1 rounded flex items-center justify-center cursor-pointer', props.classNames)}
  >
    {props.children}
  </div>
);

const InactiveTab = (props: Omit<ITab, 'children' | 'onDoubleClick'>) => (
  <Tab onClick={props.onClick} classNames="hover:bg-gray-bg bg-gray-light">
    <Icon name="plus" size="22" color="white" />
  </Tab>
);
const ActiveTab = (props: Omit<ITab, 'children'>) => (
  <Tab onDoubleClick={props.onDoubleClick} classNames="hover:bg-teal bg-borderColor-primary">
    <Icon name="play-fill-new" size="22" color="white" />
  </Tab>
);
const CurrentTab = () => (
  <Tab classNames="bg-teal color-white">
    <span style={{ fontSize: '0.65rem' }}>PLAYING</span>
  </Tab>
);

function AssistTabs({ session }: { session: Session }) {
  const { showModal, hideModal } = useModal();
  const { assistTabStore } = useStore()

  const placeholder = new Array(4 - assistTabStore.sessions.length).fill(0)

  React.useEffect(() => {
    if (assistTabStore.sessions.length === 0) {
      assistTabStore.addSession(session)
      assistTabStore.setActiveSession(session.sessionId)
    }
  }, [])

  const showAssistList = () => showModal(<AssistSessionsModal onAdd={hideModal} />, { right: true });
  return (
    <div className="grid grid-cols-2 w-28 h-full" style={{ gap: '4px' }}>
      {assistTabStore.sessions.map(session => (
        <React.Fragment key={session.sessionId}>
          {assistTabStore.isActive(session.sessionId)
        ? <CurrentTab /> : <ActiveTab />}
        </React.Fragment>
      )
      )}
      {placeholder.map((_, i) => (
        <React.Fragment key={i}>
          <InactiveTab onClick={showAssistList} />
        </React.Fragment>
      ))}
    </div>
  );
}

export default observer(AssistTabs);
