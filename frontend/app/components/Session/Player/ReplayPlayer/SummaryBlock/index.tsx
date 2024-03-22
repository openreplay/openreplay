import { observer } from 'mobx-react-lite';
import React from 'react';
import { connect } from 'react-redux';

import { useStore } from 'App/mstore';
import { debounce }                          from 'App/utils';
import { IResourceRequest, IResourceTiming } from "../../../../../player";
import { WsChannel }                         from "../../../../../player/web/messages";
import { PlayerContext } from "../../../playerContext";

let debounceUpdate: any = () => {};

const userBehaviorRegex = /User\s+(\w+\s+)?Behavior/i;
const issuesErrorsRegex = /Issues\s+(and\s+|,?\s+)?(\w+\s+)?Errors/i;

function isTitleLine(line: string): boolean {
  return userBehaviorRegex.test(line) || issuesErrorsRegex.test(line);
}

function SummaryBlock({
  sessionId,
  zoomEnabled,
  zoomStartTs,
  zoomEndTs,
  zoomTab,
  duration,
}: {
  sessionId: string;
  zoomEnabled: boolean;
  zoomStartTs: number;
  zoomEndTs: number;
  zoomTab: 'overview' | 'journey' | 'issues' | 'errors';
  duration: any;
}) {
  const { store } = React.useContext(PlayerContext)
  const { tabStates } = store.get();
  const { aiSummaryStore } = useStore();

  React.useEffect(() => {
    debounceUpdate = debounce(
      (
        sessionId: string,
        events: any[],
        feat: 'journey' | 'issues' | 'errors',
        startTs: number,
        endTs: number
      ) => aiSummaryStore.getDetailedSummary(sessionId, events, feat, startTs, endTs),
      500
    );
  }, []);

  React.useEffect(() => {
    if (zoomTab === 'overview') {
      void aiSummaryStore.getSummary(sessionId);
    } else {
        const totalFetchList: IResourceRequest[] = [];
        const totalResourceList: IResourceTiming[] = [];
        const totalWebsocketList: WsChannel[] = [];
      Object.values(tabStates).forEach(({
        fetchList,
        resourceList,
        websocketList,
      }) => {
        totalFetchList.push(...fetchList);
        totalResourceList.push(...resourceList);
        totalWebsocketList.push(...websocketList);
      })
      const resultingEvents = [
        ...totalFetchList,
        ...totalResourceList,
        ...totalWebsocketList,
      ]
      const range = !zoomEnabled ? [0, duration] : [zoomStartTs, zoomEndTs];
      void debounceUpdate(sessionId, resultingEvents, zoomTab, range[0], range[1]);
    }
  }, [zoomTab]);

  const formattedText = aiSummaryStore.text.split('\n').map((line) => {
    if (isTitleLine(line)) {
      return <div className={'font-semibold mt-2'}>{line}</div>;
    }
    if (line.startsWith('*')) {
      return (
        <li className={'ml-1 marker:mr-1 flex items-center gap-1'}>
            <CodeStringFormatter text={line.replace('* ', '')} />
        </li>
      );
    }
    return (
      <div className={'flex items-center gap-1'}>
        <CodeStringFormatter text={line} />
      </div>
    );
  });

  return (
    <div style={summaryBlockStyle}>
      {/*<div*/}
      {/*  className={*/}
      {/*    'flex items-center gap-2 px-2 py-1 rounded border border-gray-light bg-white w-fit'*/}
      {/*  }*/}
      {/*>*/}
      {/*  User Behavior Analysis*/}
      {/*</div>*/}

      {aiSummaryStore.text ? (
        <div className={'rounded p-4 bg-white whitespace-pre-wrap flex flex-col'}>
          <>{formattedText.map((v) => v)}</>
        </div>
      ) : (
        <TextPlaceholder />
      )}
    </div>
  );
}

function TextPlaceholder() {
  return (
    <div className={'animate-pulse rounded p-4 bg-white whitespace-pre-wrap flex flex-col gap-2'}>
      <div className={'h-2 bg-gray-medium rounded'} />
      <div className={'h-2 bg-gray-medium rounded'} />
      <div className={'grid grid-cols-3 gap-2'}>
        <div className={'h-2 bg-gray-medium rounded col-span-2'} />
        <div className={'h-2 bg-gray-medium rounded col-span-1'} />
      </div>

      <div className={'grid grid-cols-4 gap-2 mt-3'}>
        <div className={'h-2 bg-gray-medium rounded col-span-1'} />
        <div className={'h-2 bg-gray-medium rounded col-span-1'} />
        <div className={'h-2 bg-gray-medium rounded col-span-2'} />
      </div>
      <div className={'grid grid-cols-4 gap-2'}>
        <div className={'h-2 bg-gray-medium rounded col-span-2'} />
        <div className={'h-2 bg-transparent rounded col-span-2'} />
      </div>
    </div>
  );
}

const CodeStringFormatter = ({ text }: { text: string }) => {
  const parts = text.split(/(`[^`]*`)/).map((part, index) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <div key={index} className="whitespace-nowrap bg-gray-lightest font-mono mx-1 px-1 border">
        {part.substring(1, part.length - 1)}
      </div>
    ) : (
      <span key={index}>{part}</span>
    )
  );

  return <>{parts}</>;
};

const summaryBlockStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #E8EBFF -24.14%, rgba(236, 254, 255, 0.00) 100%)',
  width: '100%',
  height: '25vh',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '1rem',
};

export default connect((state: Record<string, any>) => ({
  zoomEnabled: state.getIn(['components', 'player']).timelineZoom.enabled,
  zoomStartTs: state.getIn(['components', 'player']).timelineZoom.startTs,
  zoomEndTs: state.getIn(['components', 'player']).timelineZoom.endTs,
  zoomTab: state.getIn(['components', 'player']).zoomTab,
  duration: state.getIn(['sessions', 'current']).durationSeconds,
}))(observer(SummaryBlock));
