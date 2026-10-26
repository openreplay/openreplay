import { observer } from 'mobx-react-lite';
import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import type { ScrollReach } from 'Components/Dashboard/Widgets/CustomMetricsWidgets/ClickMapCard/scrollReach';
import Overlay from 'Components/Session_/Player/Overlay';

import { HeatmapMinimap } from './HeatmapMinimap';
import { ScrollLayer } from './ScrollLayer';

/**
 * The replayed page inside a fixed window that scrolls, the minimap beside
 * it; on a scroll map the reach layer is drawn into the page itself.
 */
function HeatmapViewer({ reach }: { reach: ScrollReach | null }) {
  const { t } = useTranslation();
  const { player } = React.useContext(PlayerContext);
  const windowRef = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState(0);

  React.useEffect(() => {
    if (windowRef.current) player.attach(windowRef.current);
    player.setOnPageFit(() => setFit((n) => n + 1));
    return () => player.setOnPageFit(undefined);
  }, []);

  const page = fit > 0 ? player.getHeatmapPage() : null;

  return (
    <div className="m-cmap__viewer">
      <div className="m-cmap__stage">
        <Overlay isClickmap />
        <div
          ref={windowRef}
          className="m-cmap__window"
          data-openreplay-obscured
          tabIndex={0}
          aria-label={t('The page')}
        />
      </div>
      <HeatmapMinimap
        windowRef={windowRef}
        page={page}
        fit={fit}
        reach={reach}
      />
      {reach &&
        page &&
        createPortal(<ScrollLayer reach={reach} labels />, page.element)}
    </div>
  );
}

export default observer(HeatmapViewer);
