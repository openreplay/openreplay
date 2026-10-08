import { Tooltip } from '@/ui/overlays/tooltip';
import copy from 'copy-to-clipboard';
import { Check, Copy } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { shortDurationFromMs } from 'App/date';

import './jump-button.css';

interface Props {
  /** without it the tail keeps only `extra` (a row with no time to jump to) */
  onClick?: () => void;
  time?: number;
  tooltip?: string;
  extra?: React.ReactNode;
}

/** A row's hover tail: extra controls and Jump, over the row's time. Rows carry `group`. */
function JumpButton({ onClick, time, tooltip, extra }: Props) {
  const { t } = useTranslation();
  const jump = onClick ? (
    <button
      type="button"
      className="m-jump__btn"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {t('Jump')}
    </button>
  ) : null;
  return (
    <div className="m-jump">
      {extra ? <div className="m-jump__extra">{extra}</div> : null}
      {tooltip && jump ? <Tooltip title={tooltip}>{jump}</Tooltip> : jump}
      {time ? (
        <span className="m-jump__time">{shortDurationFromMs(time)}</span>
      ) : null}
    </div>
  );
}

export function RowCopy({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Tooltip title={copied ? t('Copied') : t('Copy this line')}>
      <button
        type="button"
        className="m-jump__icon"
        aria-label={t('Copy this line')}
        onClick={(e) => {
          e.stopPropagation();
          copy(text);
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1000);
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </Tooltip>
  );
}

export default JumpButton;
