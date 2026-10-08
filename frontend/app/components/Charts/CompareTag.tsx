import { ArrowDown, ArrowUp } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

/** Change against the compared period; `invert` when lower is better. */
export function CompareTag({
  delta,
  invert = false,
}: {
  delta: number;
  invert?: boolean;
}) {
  const { t } = useTranslation();
  const up = delta >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className={`m-cmp${good ? ' is-good' : ' is-bad'}`}
      title={
        up
          ? t('Up {{n}}% against the compared period', { n: Math.abs(delta) })
          : t('Down {{n}}% against the compared period', { n: Math.abs(delta) })
      }
    >
      {up ? (
        <ArrowUp size={11} aria-hidden="true" />
      ) : (
        <ArrowDown size={11} aria-hidden="true" />
      )}
      {Math.abs(delta)}%
    </span>
  );
}
