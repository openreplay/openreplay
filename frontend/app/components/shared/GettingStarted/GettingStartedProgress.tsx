import React, { useEffect } from 'react';
import CircleProgress from './CircleProgress';
import { useModal } from 'App/components/Modal';
import GettingStartedModal from './GettingStartedModal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

interface Props {
  // completed: number;
  // total: number;
}

const list: any[] = [
  {
    title: '🕵️ Install OpenReplay',
    status: 'pending',
    description: 'Install OpenReplay on your website or mobile app.',
    icon: 'tools',
  },
  {
    title: '🕵️ Identify Users',
    status: 'pending',
    description: 'Identify users across devices and sessions.',
    icon: 'users',
  },
  {
    title: '🕵️ Integrations',
    status: 'completed',
    description: 'Identify users across devices and sessions.',
    icon: 'users',
  },
  {
    title: '🕵️ Invite Team Members',
    status: 'ignored',
    description: 'Identify users across devices and sessions.',
    icon: 'users',
  },
];
const GettingStartedProgress: React.FC<Props> = () => {
  // const percentage = Math.round((completed / total) * 100);
  // const label = `${completed}/${total}`;
  // const pending = total - completed;
  const { showModal } = useModal();

  const {
    settingsStore: { gettingStarted },
  } = useStore();

  useEffect(() => {
    gettingStarted.fetchData();
  }, []);

  const clickHandler = () => {
    showModal(<GettingStartedModal list={gettingStarted.steps} />, { right: true, width: 450 });
  };

  return (
    <div className="flex items-center cursor-pointer" onClick={clickHandler}>
      <CircleProgress label={gettingStarted.label} percentage={gettingStarted.percentageCompleted} />
      <div className="ml-2">
        <div className="text-lg color-teal" style={{ lineHeight: '15px' }}>
          Setup
        </div>
        <div className="color-gray-meidum text-sm">{gettingStarted.numPending} Pending</div>
      </div>
    </div>
  );
};

export default observer(GettingStartedProgress);
