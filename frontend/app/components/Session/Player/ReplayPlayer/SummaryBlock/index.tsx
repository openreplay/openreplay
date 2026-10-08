import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { IResourceRequest, IResourceTiming } from 'Player';
import { WsChannel } from 'Player/web/messages';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { debounce } from 'App/utils';

import MDRenderer from 'Shared/MDRenderer/MDRenderer';

let debounceUpdate: any = () => {};

function SummaryBlock({ sessionId }: { sessionId: string }) {
  const { store } = React.useContext(PlayerContext);
  const { tabStates } = store.get();
  const { aiSummaryStore, uiPlayerStore, sessionStore } = useStore();
  const duration = sessionStore.current.durationSeconds;
  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;
  const zoomTab = uiPlayerStore.zoomTab;

  React.useEffect(() => {
    debounceUpdate = debounce(
      (
        sessionId: string,
        events: any[],
        feat: 'journey' | 'issues' | 'errors',
        startTs: number,
        endTs: number,
      ) =>
        aiSummaryStore.getDetailedSummary(
          sessionId,
          events,
          feat,
          startTs,
          endTs,
        ),
      500,
    );
  }, []);

  React.useEffect(() => {
    if (zoomTab === 'overview') {
      void aiSummaryStore.getSummary(sessionId);
    } else {
      const totalFetchList: IResourceRequest[] = [];
      const totalResourceList: IResourceTiming[] = [];
      const totalWebsocketList: WsChannel[] = [];
      Object.values(tabStates).forEach(
        ({ fetchList, resourceList, websocketList }) => {
          totalFetchList.push(...fetchList);
          totalResourceList.push(...resourceList);
          totalWebsocketList.push(...websocketList);
        },
      );
      const resultingEvents = [
        ...totalFetchList,
        ...totalResourceList,
        ...totalWebsocketList,
      ];
      const range = !zoomEnabled ? [0, duration] : [zoomStartTs, zoomEndTs];
      void debounceUpdate(
        sessionId,
        resultingEvents,
        zoomTab,
        range[0],
        range[1],
      );
    }
  }, [zoomTab]);

  return (
    <div className="flex max-h-[25vh] w-full flex-col overflow-auto border-b border-border-subtle bg-surface-sunken p-4">
      <div className="flex flex-col whitespace-pre-wrap rounded-surface border border-border-subtle bg-surface-default p-4 text-sm text-content-primary">
        {aiSummaryStore.text ? (
          <MDRenderer content={aiSummaryStore.text} />
        ) : (
          <SkeletonRows rows={3} />
        )}
      </div>
    </div>
  );
}

export default observer(SummaryBlock);
