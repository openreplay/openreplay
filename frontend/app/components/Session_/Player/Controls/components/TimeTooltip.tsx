import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import stl from './styles.module.css';
import { useTranslation } from 'react-i18next';

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
      className={`${stl.timeTooltip} p-2 rounded-lg min-w-40 max-w-64`}
      style={{
        top: 0,
        left: `calc(${offset}px - 0.5rem)`,
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
          <span className="text-gray-light">
            {t('local:')}
            {localTime}
          </span>
        </>
      ) : null}
      {userTime ? (
        <>
          <br />
          <span className="text-gray-light">
            {t('user:')}
            {userTime}
          </span>
        </>
      ) : null}
    </div>
  );
}

export default observer(TimeTooltip);
