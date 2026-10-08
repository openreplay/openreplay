import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import stl from './styles.module.css';

function TimeTooltip() {
  const { t } = useTranslation();
  const { sessionStore } = useStore();
  const { timeLineTooltip } = sessionStore;
  const {
    time = 0,
    offset = 0,
    isVisible,
    localTime,
    userTime,
  } = timeLineTooltip;
  return (
    <div
      className={stl.timeTooltip}
      style={{
        top: 0,
        left: `${offset}px`,
        display: isVisible ? 'block' : 'none',
        transform: 'translate(-50%, -110%)',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}
    >
      {!time ? 'Loading' : time}
      {localTime ? (
        <>
          <br />
          <span className={stl.timeTooltipSub}>
            {`${t('Local')}: ${localTime}`}
          </span>
        </>
      ) : null}
      {userTime ? (
        <>
          <br />
          <span className={stl.timeTooltipSub}>
            {`${t('User')}: ${userTime}`}
          </span>
        </>
      ) : null}
    </div>
  );
}

export default observer(TimeTooltip);
