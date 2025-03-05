import React from 'react';
import cn from 'classnames';
import type { MarkedTarget } from 'Player';
import { Tooltip } from 'antd';
import { PlayerContext } from 'App/components/Session/playerContext';
import stl from './SelectorCard.module.css';
import { useTranslation } from 'react-i18next';

interface Props {
  index?: number;
  target: MarkedTarget;
  showContent: boolean;
}

export default function SelectorCard({
  index = 1,
  target,
  showContent,
}: Props) {
  const { t } = useTranslation();
  const { player } = React.useContext(PlayerContext);
  const activeTarget = player.setActiveTarget;

  return (
    // @ts-ignore TODO for Alex
    <div
      className={cn(stl.wrapper, 'rounded-xl', { [stl.active]: showContent })}
      onClick={() => activeTarget(index)}
    >
      <div className={stl.top}>
        {/* @ts-ignore */}
        <Tooltip position="top" title={t('Rank of the most clicked element')}>
          <div className={stl.index}>{index + 1}</div>
        </Tooltip>
        <div className="truncate font-mono">{target.selector}</div>
      </div>
      {showContent && (
        <div className={stl.counts}>
          <div>
            {target.count}&nbsp;{t('Click')}
            {target.count > 1 ? 's' : ''} -{target.percent}%
          </div>
          <div className="text-neutral-400">{t('TOTAL CLICKS')}</div>
        </div>
      )}
    </div>
  );
}
