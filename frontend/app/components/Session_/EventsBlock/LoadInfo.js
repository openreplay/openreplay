/* eslint-disable i18next/no-literal-string */
import React from 'react';

import { numberWithCommas } from 'App/utils';

import styles from './loadInfo.module.css';
import { useTranslation } from 'react-i18next';

function LoadInfo({
  webvitals,
  event: { fcpTime, visuallyComplete, timeToInteractive },
  prorata: { a, b, c },
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className={styles.bar}>
        {typeof fcpTime === 'number' && <div style={{ width: `${a}%` }} />}
        {typeof visuallyComplete === 'number' && (
          <div style={{ width: `${b}%` }} />
        )}
        {typeof timeToInteractive === 'number' && (
          <div style={{ width: `${c}%` }} />
        )}
      </div>
      <div className={styles.bottomBlock}>
        {typeof fcpTime === 'number' && (
          <div className={styles.wrapper}>
            <div className={styles.lines} />
            <div className={styles.label}>{t('Time to Render')}</div>
            <div className={styles.value}>
              {`${numberWithCommas(fcpTime || 0)}${t('ms')}`}
            </div>
          </div>
        )}
        {typeof visuallyComplete === 'number' && (
          <div className={styles.wrapper}>
            <div className={styles.lines} />
            <div className={styles.label}>{t('Visually Complete')}</div>
            <div className={styles.value}>
              {`${numberWithCommas(visuallyComplete || 0)}${t('ms')}`}
            </div>
          </div>
        )}
        {typeof timeToInteractive === 'number' && (
          <div className={styles.wrapper}>
            <div className={styles.lines} />
            <div className={styles.label}>{t('Time To Interactive')}</div>
            <div className={styles.value}>
              {`${numberWithCommas(timeToInteractive || 0)}${t('ms')}`}
            </div>
          </div>
        )}
        {webvitals
          ? Object.keys(webvitals).map((key) => (
              <WebVitalsValueMemo
                name={key.toUpperCase()}
                value={webvitals[key]}
              />
            ))
          : null}
      </div>
    </div>
  );
}

function WebVitalsValue({ name, value }) {
  const valInt = Number(value);
  const valDisplay =
    name !== 'CLS'
      ? Math.round(valInt)
      : valInt > 1
        ? Math.round(valInt)
        : valInt.toExponential(1).split('e');

  const unit = {
    CLS: 'score',
    FCP: 'ms',
    INP: 'ms',
    LCP: 'ms',
    TTFB: 'ms',
  };
  return (
    <div className={styles.wrapper}>
      <div className={styles.lines} />
      <div className={styles.label}>{name}</div>
      <div className={styles.value}>
        {Array.isArray(valDisplay) ? (
          <>
            {valDisplay[0]}
            &times; 10
            <sup>{valDisplay[1]}</sup>
          </>
        ) : (
          <>
            {valDisplay} {unit[name]}
          </>
        )}
      </div>
    </div>
  );
}

const WebVitalsValueMemo = React.memo(WebVitalsValue);

LoadInfo.displayName = 'LoadInfo';

export default React.memo(LoadInfo);
