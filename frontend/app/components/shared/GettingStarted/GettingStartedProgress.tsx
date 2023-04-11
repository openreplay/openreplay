import React, { useEffect } from 'react';
import CircleProgress from './CircleProgress';
import { useModal } from 'App/components/Modal';
import GettingStartedModal from './GettingStartedModal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const GettingStartedProgress: React.FC<null> = () => {
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
  return gettingStarted.status === 'completed' ? null : (
    <div className="mr-6 flex items-cetner cursor-pointer hover:bg-active-blue px-4">
      <div className="flex items-center cursor-pointer" onClick={clickHandler}>
        <CircleProgress
          label={gettingStarted.label}
          percentage={gettingStarted.percentageCompleted}
        />
        <div className="ml-2">
          <div className="text-lg color-teal" style={{ lineHeight: '15px' }}>
            Setup
          </div>
          <div className="color-gray-meidum text-sm">{gettingStarted.numPending} Pending</div>
        </div>
      </div>
    </div>
  );
};

export default observer(GettingStartedProgress);
