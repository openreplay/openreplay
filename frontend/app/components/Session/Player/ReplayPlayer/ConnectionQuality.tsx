import {
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

enum SignalQuality {
  Lowest,
  Low,
  Medium,
  High,
  Full,
}

const SignalIcons = {
  [SignalQuality.Lowest]: SignalZero,
  [SignalQuality.Low]: SignalLow,
  [SignalQuality.Medium]: SignalMedium,
  [SignalQuality.High]: SignalHigh,
  [SignalQuality.Full]: Signal,
};

const signalTexts = {
  [SignalQuality.Lowest]: 'No or very limited',
  [SignalQuality.Low]: 'Poor',
  [SignalQuality.Medium]: 'Average',
  [SignalQuality.High]: 'Good',
  [SignalQuality.Full]: 'Excellent',
};

function ConnectionQuality({ connection }: { connection: number }) {
  const { t } = useTranslation();
  const q = (
    connection in signalTexts ? connection : SignalQuality.Full
  ) as SignalQuality;
  const Icon = SignalIcons[q];
  return (
    <span className={q <= SignalQuality.Low ? 'is-bad' : undefined}>
      {t('Connection quality')}
      <Icon size={13} aria-hidden="true" className="m-dt__signal" />
      <b>{t(signalTexts[q])}</b>
    </span>
  );
}

export default ConnectionQuality;
