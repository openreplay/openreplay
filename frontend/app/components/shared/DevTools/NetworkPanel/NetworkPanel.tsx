/* eslint-disable i18next/no-literal-string */
import { observer } from 'mobx-react-lite';
import React from 'react';

import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { NetworkPanelComp } from './NetworkPanelComp';

// Constants remain the same
const ALL = 'ALL';
const XHR = 'xhr';
const JS = 'js';
const CSS = 'css';
const IMG = 'img';
const MEDIA = 'media';
const OTHER = 'other';
const WS = 'websocket';
const GRAPHQL = 'graphql';

const TAP_KEYS = [ALL, XHR, JS, CSS, IMG, MEDIA, OTHER, WS, GRAPHQL] as const;
export const NETWORK_TABS = TAP_KEYS.map((tab) => ({
  text: tab === 'xhr' ? 'Fetch/XHR' : tab,
  key: tab,
}));

export function renderType(r: any) {
  return (
    <Tooltip style={{ width: '100%' }} title={<div>{r.type}</div>}>
      <div>{r.type}</div>
    </Tooltip>
  );
}

export function renderName(r: any) {
  const maxTtipUrlLength = 800;
  const tooltipUrl =
    r.url && r.url.length > maxTtipUrlLength
      ? `${r.url.slice(0, maxTtipUrlLength / 2)}......${r.url.slice(-maxTtipUrlLength / 2)}`
      : r.url;

  return (
    <Tooltip
      style={{ width: '100%', maxWidth: 1024 }}
      title={<div>{tooltipUrl}</div>}
    >
      <div
        style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {r.name}
      </div>
    </Tooltip>
  );
}

export function renderDuration(r: any) {
  const { t } = useTranslation();
  if (!r.success) return 'x';

  const text = `${Math.floor(r.duration)}ms`;
  if (!r.isRed && !r.isYellow) return text;

  let tooltipText;
  if (r.isYellow) {
    tooltipText = t('Slower than average');
  } else {
    tooltipText = t('Much slower than average');
  }

  return (
    <Tooltip style={{ width: '100%' }} title={tooltipText}>
      <div> {text} </div>
    </Tooltip>
  );
}

// Main component for Network Panel
function NetworkPanelCont({
  panelHeight,
  isLive,
}: {
  panelHeight: number;
  isLive?: boolean;
}) {
  const { player, store } = React.useContext(PlayerContext);
  const { sessionStore, uiPlayerStore } = useStore();

  const { startedAt, sessionId } = sessionStore.current;
  const {
    domContentLoadedTime,
    loadTime,
    domBuildingTime,
    tabStates,
    currentTab,
    tabNames,
  } = store.get();
  const tabsArr = Object.keys(tabStates);
  const tabValues = Object.values(tabStates);
  const { dataSource } = uiPlayerStore;
  const showSingleTab = dataSource === 'current';

  let fetchList = [];
  let resourceList = [];
  let fetchListNow = [];
  let resourceListNow = [];
  let websocketList = [];
  let websocketListNow = [];

  if (showSingleTab) {
    const state = tabStates[currentTab] ?? {};
    fetchList = state.fetchList ?? [];
    resourceList = state.resourceList ?? [];
    fetchListNow = state.fetchListNow ?? [];
    resourceListNow = state.resourceListNow ?? [];
    websocketList = state.websocketList ?? [];
    websocketListNow = state.websocketListNow ?? [];
  } else {
    fetchList = tabValues.flatMap((tab) => tab.fetchList);
    resourceList = tabValues.flatMap((tab) => tab.resourceList);
    fetchListNow = tabValues.flatMap((tab) => tab.fetchListNow).filter(Boolean);
    resourceListNow = tabValues
      .flatMap((tab) => tab.resourceListNow)
      .filter(Boolean);
    websocketList = tabValues.flatMap((tab) => tab.websocketList);
    websocketListNow = tabValues
      .flatMap((tab) => tab.websocketListNow)
      .filter(Boolean);
  }

  const getTabNum = (tab: string) => tabsArr.findIndex((t) => t === tab) + 1;
  const getTabName = (tabId: string) => tabNames[tabId];

  return (
    <NetworkPanelComp
      loadTime={loadTime}
      panelHeight={panelHeight}
      domBuildingTime={domBuildingTime}
      domContentLoadedTime={domContentLoadedTime}
      fetchList={fetchList}
      resourceList={resourceList}
      fetchListNow={fetchListNow}
      resourceListNow={resourceListNow}
      player={player}
      startedAt={startedAt}
      websocketList={websocketList}
      websocketListNow={websocketListNow}
      getTabNum={getTabNum}
      getTabName={getTabName}
      showSingleTab={showSingleTab}
      isLive={isLive}
      sessionId={sessionId}
    />
  );
}

function MobileNetworkPanelCont({ panelHeight }: { panelHeight: number }) {
  const { player, store } = React.useContext(MobilePlayerContext);
  const { uiPlayerStore, sessionStore } = useStore();
  const { startedAt, sessionId } = sessionStore.current;
  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;
  const domContentLoadedTime = undefined;
  const loadTime = undefined;
  const domBuildingTime = undefined;
  const {
    fetchList = [],
    resourceList = [],
    fetchListNow = [],
    resourceListNow = [],
    websocketList = [],
    websocketListNow = [],
  } = store.get();

  return (
    <NetworkPanelComp
      isMobile
      panelHeight={panelHeight}
      loadTime={loadTime}
      domBuildingTime={domBuildingTime}
      domContentLoadedTime={domContentLoadedTime}
      fetchList={fetchList}
      resourceList={resourceList}
      fetchListNow={fetchListNow}
      resourceListNow={resourceListNow}
      player={player}
      startedAt={startedAt}
      websocketList={websocketList}
      websocketListNow={websocketListNow}
      zoomEnabled={zoomEnabled}
      zoomStartTs={zoomStartTs}
      zoomEndTs={zoomEndTs}
      sessionId={sessionId}
    />
  );
}

const WebNetworkPanel = observer(NetworkPanelCont);
const MobileNetworkPanel = observer(MobileNetworkPanelCont);

export { WebNetworkPanel, MobileNetworkPanel };
