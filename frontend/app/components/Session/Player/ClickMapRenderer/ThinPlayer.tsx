import { FilterKey } from '@/types/filter/filterType';
import { toast } from '@/ui/overlays/toast';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import { createClickMapPlayer } from 'Player';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

import { useStore } from 'App/mstore';
import { wrapPlayerStore } from 'Components/Session/playerStore';

import {
  IPlayerContext,
  PlayerContext,
  defaultContextValue,
} from '../../playerContext';
import PlayerContent from './ThinPlayerContent';

/** Mounted once per heatmap session (the card keys it by sessionId). */
function WebPlayer(props: any) {
  const { filterStore, dashboardStore } = useStore();
  const { session, jumpTimestamp, points } = props;
  // @ts-ignore
  const [contextValue, setContextValue] =
    useState<IPlayerContext>(defaultContextValue);
  const appliedRef = React.useRef<{ points: any; jump: number } | null>(null);

  useEffect(() => {
    const [player, store] = createClickMapPlayer(
      session,
      wrapPlayerStore,
      toast,
    );
    player.setOnCluster((coords) => {
      const click = filterStore.findEvent({ name: FilterKey.CLICK });
      const projectFilters = filterStore.getCurrentProjectFilters();
      const normalizedXFilter = projectFilters.find(
        (f) => f.name === 'normalizedX',
      );
      const normalizedYFilter = projectFilters.find(
        (f) => f.name === 'normalizedY',
      );
      if (normalizedXFilter && normalizedYFilter) {
        // [x1, y1], [x2, y2]
        coords.forEach((set, i) => {
          click.filters?.push(
            // @ts-ignore
            {
              ...normalizedXFilter,
              value: [set[0]],
              operator: i === 0 ? '>' : '<',
            },
            {
              ...normalizedYFilter,
              value: [set[1]],
              operator: i === 0 ? '>' : '<',
            },
          );
        });
      }
      dashboardStore.drillDownFilter.replaceFilters([click]);
    });
    // sync the created player into context (same bootstrap as WebPlayer.tsx)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContextValue({ player, store });
    return () => player.clean();
  }, []);

  const state = contextValue.store?.get();
  // the jump target may sit in a later file, and the frozen frame is never redrawn
  const isPlayerReady = state?.ready && !state?.domLoading;

  useEffect(() => {
    const { player } = contextValue;
    if (!player || !isPlayerReady || !points?.length) return;
    const applied = appliedRef.current;
    if (applied?.points === points && applied?.jump === jumpTimestamp) return;
    appliedRef.current = { points, jump: jumpTimestamp };
    player.pause();
    player.jump(jumpTimestamp);
    player.showClickmap(points);
  }, [contextValue, points, isPlayerReady, jumpTimestamp]);

  if (!contextValue.player || !session) return null;

  return (
    <PlayerContext.Provider value={contextValue}>
      <PlayerContent />
    </PlayerContext.Provider>
  );
}

export default withLocationHandlers()(observer(WebPlayer));
