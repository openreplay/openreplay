import React, { useEffect, useState } from 'react';
import { createClickMapPlayer } from 'Player';
import { makeAutoObservable } from 'mobx';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import {
  IPlayerContext,
  PlayerContext,
  defaultContextValue,
} from '../../playerContext';
import PlayerContent from './ThinPlayerContent';
import { FilterKey } from '@/types/filter/filterType';

function WebPlayer(props: any) {
  const { sessionStore, filterStore, dashboardStore } = useStore();
  const { insights } = sessionStore;
  const { session, jumpTimestamp } = props;
  // @ts-ignore
  const [contextValue, setContextValue] =
    useState<IPlayerContext>(defaultContextValue);
  const playerRef = React.useRef<any>(null);
  const insightsSize = React.useRef(0);

  useEffect(() => {
    const init = () => {
      const [WebPlayerInst, PlayerStore] = createClickMapPlayer(
        session,
        (state) => makeAutoObservable(state),
        toast,
      );
      playerRef.current = WebPlayerInst;
      setContextValue({ player: WebPlayerInst, store: PlayerStore });
      WebPlayerInst.setOnCluster((coords) => {
        const click = filterStore.findEvent({ name: FilterKey.CLICK });
        const normalizedXFilter = filterStore
          .getCurrentProjectFilters()
          .find((f) => f.name === 'normalized_x');
        const normalizedYFilter = filterStore
          .getCurrentProjectFilters()
          .find((f) => f.name === 'normalized_y');
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
        const existingFilter = dashboardStore.drillDownFilter.filters.findIndex(f => f.name === 'CLICK')
        if (existingFilter > -1) {
          dashboardStore.drillDownFilter.removeFilter(existingFilter);
        }
        dashboardStore.drillDownFilter.replaceFilters([click]);
      });
    };

    if (!playerRef.current) {
      init();
    } else {
      playerRef.current.clean();
      playerRef.current = null;
      setContextValue(defaultContextValue);
      init();
    }
  }, [session.sessionId]);

  React.useEffect(
    () => () => {
      playerRef.current && playerRef.current.clean();
      playerRef.current = null;
      // @ts-ignore
      setContextValue(defaultContextValue);
    },
    [],
  );

  const isPlayerReady = contextValue.store?.get().ready;

  React.useEffect(() => {
    contextValue.player && contextValue.player.play();
    if (
      isPlayerReady &&
      insights.length > 0 &&
      jumpTimestamp &&
      insightsSize.current !== insights.length
    ) {
      insightsSize.current = insights.length;
      setTimeout(() => {
        contextValue.player.pause();
        contextValue.player.jump(jumpTimestamp);
        setTimeout(() => {
          contextValue.player.scale();
          contextValue.player.showClickmap(insights);
        }, 250);
      }, 250);
    }
  }, [insights, isPlayerReady, jumpTimestamp]);

  if (!contextValue.player || !session) return null;

  return (
    <PlayerContext.Provider value={contextValue}>
      <PlayerContent />
    </PlayerContext.Provider>
  );
}

export default withLocationHandlers()(observer(WebPlayer));
