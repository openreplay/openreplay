import React from 'react'
import cn from 'classnames';
import { useModal } from 'App/components/Modal';
import { Icon } from 'UI';
import AssistSessionsList from '../AssistSessionsModal';

interface ITab {
  onClick?: () => void;
  classNames?: string;
  children: React.ReactNode;
}

const Tab = (props: ITab) => (
  <div 
    onClick={props.onClick} 
    className={cn("p-1 rounded w-13 flex items-center justify-center cursor-pointer", props.classNames)}>
    {props.children}
  </div>
)

const InactiveTab = (props: Omit<ITab, 'children'>) => (
  <Tab onClick={props.onClick} classNames="hover:bg-gray-bg bg-gray-light">
    <Icon name="plus" size="22" color="white" />
  </Tab>
)
const ActiveTab = (props: Omit<ITab, 'children'>) => (
  <Tab onClick={props.onClick} classNames="hover:bg-teal bg-borderColor-primary">
    <Icon name="play-fill-new" size="22" color="white" />
  </Tab>
)
const CurrentTab = (props: Omit<ITab, 'children'>) => (
  <Tab onClick={props.onClick} classNames="bg-teal color-white">
    <span style={{ fontSize: '0.65rem' }}>PLAYING</span>
  </Tab>
)

function AssistTabs() {
  const { showModal } = useModal();

  const showAssistList = () =>  showModal(<AssistSessionsList />, { right: true });
  return (
    <div className="grid grid-cols-2 w-28" style={{ gap: '4px' }}>
      <CurrentTab />
      <ActiveTab />
      <InactiveTab onClick={showAssistList} />
      <InactiveTab onClick={showAssistList} />
    </div>
  )
}

export default AssistTabs
