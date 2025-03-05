import React, { useEffect, useState } from 'react';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import { Button } from 'antd';
import AutoplayToggle from 'Shared/AutoplayToggle';
import { useStore } from 'App/mstore';
import stl from './AutoplayTimer.module.css';
import clsOv from './overlay.module.css';
import { useTranslation } from 'react-i18next';

function AutoplayTimer({ history }: any) {
  const { t } = useTranslation();
  let timer: NodeJS.Timer;
  const [cancelled, setCancelled] = useState(false);
  const [counter, setCounter] = useState(5);
  const { clipStore } = useStore();

  useEffect(() => {
    if (counter > 0) {
      timer = setTimeout(() => {
        setCounter(counter - 1);
      }, 1000);
    }

    if (counter === 0) {
      clipStore.next();
    }

    return () => clearTimeout(timer);
  }, [counter]);

  const cancel = () => {
    clearTimeout(timer);
    setCancelled(true);
  };

  if (cancelled) return null;

  return (
    <div className={cn(clsOv.overlay, stl.overlayBg, 'z-10')}>
      <div className="border p-5 shadow-lg bg-white rounded">
        <div className="mb-5">
          {t('Autoplaying next clip in')}&nbsp;
          <span className="font-medium">{counter}</span>&nbsp;{t('seconds')}
        </div>

        <div className="flex items-center justify-between">
          <div className="mr-10">
            <AutoplayToggle />
          </div>
          <div className="flex items-center">
            <Button type="text" onClick={cancel}>
              {t('Cancel')}
            </Button>
            <div className="px-2" />
            <Button type="default" onClick={() => clipStore.next()}>
              {t('Play Now')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default observer(AutoplayTimer);
