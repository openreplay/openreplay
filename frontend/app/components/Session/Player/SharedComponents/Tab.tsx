import { Tooltip } from '@/ui/overlays/tooltip';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  i: number;
  tab: string;
  currentTab: string;
  changeTab?: (tab: string) => void;
  isLive?: boolean;
  isClosed?: boolean;
  name?: string;
}

function Tab({ i, tab, currentTab, changeTab, isLive, isClosed, name }: Props) {
  const { t } = useTranslation();
  const shown = currentTab === tab;
  const title = name || t('Tab {{n}}', { n: i + 1 });
  return (
    <Tooltip
      title={isClosed ? t('{{title}} · closed', { title }) : title}
      side="bottom"
      delay={500}
    >
      <button
        type="button"
        role="tab"
        aria-selected={shown}
        disabled={isLive}
        className={`m-rtabs__tab${shown ? ' is-shown' : ''}${isClosed ? ' is-closed' : ''}`}
        onClick={() => changeTab?.(tab)}
      >
        <span className="m-rtabs__n m-mono" aria-hidden="true">
          {i + 1}
        </span>
        <span className="m-rtabs__title m-truncate">{title}</span>
      </button>
    </Tooltip>
  );
}

export default Tab;
