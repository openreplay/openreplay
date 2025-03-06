import React, { useEffect } from 'react';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import GettingStartedModal from './GettingStartedModal';
import CircleProgress from './CircleProgress';
import { useTranslation } from 'react-i18next';

function GettingStartedProgress() {
  const { showModal } = useModal();
  const { t } = useTranslation();

  const {
    settingsStore: { gettingStarted },
    userStore,
  } = useStore();
  const { isLoggedIn } = userStore;

  useEffect(() => {
    if (isLoggedIn) {
      gettingStarted.fetchData();
    }
  }, [isLoggedIn]);

  const clickHandler = () => {
    showModal(<GettingStartedModal list={gettingStarted.steps} />, {
      right: true,
      width: 450,
    });
  };
  return gettingStarted.status === 'completed' ? null : (
    <div className="mr-4 flex items-cetner cursor-pointer hover:bg-active-blue px-4">
      <div className="flex items-center cursor-pointer" onClick={clickHandler}>
        <CircleProgress
          label={gettingStarted.label}
          percentage={gettingStarted.percentageCompleted}
        />
        <div className="ml-2">
          <div className="text-lg color-teal" style={{ lineHeight: '15px' }}>
            {t('Setup')}
          </div>
          <div className="color-gray-meidum text-sm">
            {gettingStarted.numPending}&nbsp;{t('Pending')}
          </div>
        </div>
      </div>
    </div>
  );
}

export default observer(GettingStartedProgress);
