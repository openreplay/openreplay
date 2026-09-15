import { Timed } from 'Player';
import { PerformanceChartPoint } from 'Player/mobile/managers/IOSPerformanceTrackManager';
import React from 'react';
import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import PerformanceAreaChart from 'Components/Charts/PerformanceAreaChart';
import { durationFromMsFormatted } from 'App/date';
import { formatBytes } from 'App/utils';
import { Tooltip as TooltipANT, Segmented } from 'antd';

import { useStore } from 'App/mstore';
import stl from './performance.module.css';

import BottomBlock from '../BottomBlock';
import InfoLine from '../BottomBlock/InfoLine';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import ConnectionQuality from 'App/components/Session/Player/ReplayPlayer/ConnectionQuality';

const CPU_VISUAL_OFFSET = 10;

const FPS_COLOR = '#C5E5E7';
const FPS_STROKE_COLOR = '#92C7CA';
const FPS_LOW_COLOR = 'pink';
const FPS_VERY_LOW_COLOR = 'red';
const CPU_COLOR = '#A8D1DE';
const CPU_STROKE_COLOR = '#69A5B8';
const USED_HEAP_COLOR = '#A9ABDC';
const USED_HEAP_STROKE_COLOR = '#8588CF';
const TOTAL_HEAP_STROKE_COLOR = '#4A4EB7';
const NODES_COUNT_COLOR = '#C6A9DC';
const NODES_COUNT_STROKE_COLOR = '#7360AC';
const HIDDEN_SCREEN_COLOR = '#CCC';

const CURSOR_COLOR = '#394EFF';

const TOTAL_HEAP = (t: TFunction) => t('Allocated Heap');
const USED_HEAP = (t: TFunction) => t('JS Heap');
const FPS = (t: TFunction) => t('Framerate');
const CPU = (t: TFunction) => t('CPU Load');
const NODES_COUNT = (t: TFunction) => t('Nodes Сount');

const tipWrap = (inner: string, style = '') =>
  `<div class="${stl.tooltipWrapper}"${style ? ` style="${style}"` : ''}>${inner}</div>`;
const tipRow = (label: string, value: string) =>
  `<span class="font-medium">${label}: </span>${value}`;

const fpsTooltip = (t: TFunction) => (row: any) => {
  if (!row) return null;
  if (row.fps == null)
    return tipWrap(
      t('Page is not active. User switched the tab or hid the window.'),
      `color:${HIDDEN_SCREEN_COLOR}`,
    );
  let color = '';
  if (row.fpsLowMarker != null && row.fpsLowMarker > 0) color = FPS_LOW_COLOR;
  if (row.fpsVeryLowMarker != null && row.fpsVeryLowMarker > 0)
    color = FPS_VERY_LOW_COLOR;
  return tipWrap(
    tipRow(FPS(t), String(Math.trunc(row.fps))),
    color ? `color:${color}` : '',
  );
};

const cpuTooltip = (t: TFunction) => (row: any) => {
  if (!row || row.cpu == null) return null;
  return tipWrap(tipRow(CPU(t), `${row.cpu - CPU_VISUAL_OFFSET}%`));
};

const mobileCpuTooltip = (t: TFunction) => (row: any) => {
  if (!row) return null;
  if (row.cpu == null)
    return tipWrap(t('App is in the background.'), `color:${HIDDEN_SCREEN_COLOR}`);
  return tipWrap(tipRow(CPU(t), `${row.cpu}%`));
};

const heapTooltip = (t: TFunction) => (row: any) => {
  if (!row) return null;
  return tipWrap(
    `<p>${tipRow(TOTAL_HEAP(t), formatBytes(row.totalHeap))}</p>` +
      `<p>${tipRow(USED_HEAP(t), formatBytes(row.usedHeap))}</p>`,
  );
};

const mobileMemoryTooltip = (t: TFunction) => (row: any) => {
  if (!row || row.memory == null) return null;
  return tipWrap(`<p>${tipRow(t('Used Memory'), formatBytes(row.memory))}</p>`);
};

const nodesCountTooltip = (t: TFunction) => (row: any) => {
  if (!row || row.nodesCount == null) return null;
  return tipWrap(`<p>${tipRow(NODES_COUNT(t), String(row.nodesCount))}</p>`);
};

const TICKS_COUNT = 10;
function generateTicks(data: Array<Timed>): Array<number> {
  if (data.length === 0) return [];
  const minTime = data[0].time;
  const maxTime = data[data.length - 1].time;

  const ticks = [];
  const tickGap = (maxTime - minTime) / (TICKS_COUNT + 1);
  for (let i = 0; i < TICKS_COUNT; i++) {
    const tick = tickGap * (i + 1) + minTime;
    ticks.push(tick);
  }
  return ticks;
}

const LOW_FPS = 30;
const VERY_LOW_FPS = 20;
const LOW_FPS_MARKER_VALUE = 5;
const HIDDEN_SCREEN_MARKER_VALUE = 20;
function addFpsMetadata(data) {
  return [...data].map((point, i) => {
    let fpsVeryLowMarker = null;
    let fpsLowMarker = null;
    let hiddenScreenMarker = 0;
    if (point.fps != null) {
      fpsVeryLowMarker = 0;
      fpsLowMarker = 0;
      if (point.fps < VERY_LOW_FPS) {
        fpsVeryLowMarker = LOW_FPS_MARKER_VALUE;
      } else if (point.fps < LOW_FPS) {
        fpsLowMarker = LOW_FPS_MARKER_VALUE;
      }
    }
    if (
      point.fps == null ||
      (i > 0 && data[i - 1].fps == null) // ||
      // (i < data.length-1 && data[i + 1].fps == null)
    ) {
      hiddenScreenMarker = HIDDEN_SCREEN_MARKER_VALUE;
    }
    if (point.cpu != null) {
      point.cpu += CPU_VISUAL_OFFSET;
    }
    return {
      ...point,
      fpsLowMarker,
      fpsVeryLowMarker,
      hiddenScreenMarker,
    };
  });
}

function generateMobileChart(
  data: PerformanceChartPoint[],
  biggestMemSpike: number,
) {
  return data.map((p) => ({
    ...p,
    isBackground: p.isBackground ? 50 : 0,
    isMemBackground: p.isBackground ? biggestMemSpike : 0,
  }));
}

export const MobilePerformance = observer(() => {
  const { t } = useTranslation();
  const { player, store } = React.useContext(MobilePlayerContext);
  const [_timeTicks, setTicks] = React.useState<number[]>([]);
  const [_data, setData] = React.useState<any[]>([]);
  const { sessionStore } = useStore();

  const { performanceChartTime = 0, performanceChartData = [] } = store.get();

  React.useEffect(() => {
    // setTicks(generateTicks(performanceChartData));
    setTicks(performanceChartData.map((p) => p.time));
    const biggestMemSpike = performanceChartData.reduce((acc, p) => {
      if (p.memory && p.memory > acc) return p.memory;
      return acc;
    }, 0);
    setData(generateMobileChart(performanceChartData, biggestMemSpike));
  }, []);

  const onDotClick = ({ index: pointer }: { index: number }) => {
    const point = _data[pointer];
    if (point) {
      player.jump(point.time);
    }
  };

  const onChartClick = (e: any) => {
    if (e === null) return;
    const { activeTooltipIndex } = e;
    const point = _data[activeTooltipIndex];
    if (point) {
      player.jump(point.time);
    }
  };

  const availableCount = 2;
  const height = `${100 / availableCount}%`;

  return (
    <BottomBlock>
      <BottomBlock.Header>
        <div className="flex items-center w-full">
          <div className="font-semibold color-gray-medium mr-auto">
            {t('Performance')}
          </div>
          <InfoLine>
            <InfoLine.Point
              label={t('Device Memory Size')}
              value={formatBytes(
                sessionStore.current.userDeviceMemorySize * 1024,
              )}
              display
            />
          </InfoLine>
        </div>
      </BottomBlock.Header>
      <BottomBlock.Content>
        <PerformanceAreaChart
            label="CPU"
            data={_data}
            cursorTime={performanceChartTime}
            cursorColor={CURSOR_COLOR}
            height={height}
            groupId="or-performance"
            ticks={_timeTicks}
            onPointClick={(i) => onDotClick({ index: i })}
            yMax={120}
            tooltipFormatter={mobileCpuTooltip(t)}
            bands={[
              { key: 'cpu', color: CPU_COLOR, strokeColor: CPU_STROKE_COLOR, gradient: true },
              { key: 'isBackground', color: HIDDEN_SCREEN_COLOR, step: true },
            ]}
          />
        <PerformanceAreaChart
            label="Memory"
            data={_data}
            cursorTime={performanceChartTime}
            cursorColor={CURSOR_COLOR}
            height={height}
            groupId="or-performance"
            ticks={_timeTicks}
            onPointClick={(i) => onDotClick({ index: i })}
            yFormatter={formatBytes}
            yMaxRatio={1.2}
            tooltipFormatter={mobileMemoryTooltip(t)}
            bands={[
              { key: 'isMemBackground', color: HIDDEN_SCREEN_COLOR, step: true },
              { key: 'memory', color: USED_HEAP_COLOR, strokeColor: USED_HEAP_STROKE_COLOR, gradient: true },
            ]}
          />
      </BottomBlock.Content>
    </BottomBlock>
  );
});

function Performance() {
  const { t } = useTranslation();
  const { sessionStore } = useStore();
  const userDeviceHeapSize = sessionStore.current.userDeviceHeapSize || 0;
  const { player, store } = React.useContext(PlayerContext);
  const [_timeTicks, setTicks] = React.useState<number[]>([]);
  const [_data, setData] = React.useState<any[]>([]);

  const {
    // connType,
    // connBandwidth,
    tabStates,
    currentTab,
    connectionQuality,
  } = store.get();

  const {
    performanceChartTime = [],
    performanceChartData = [],
    performanceAvailability: availability = {},
  } = tabStates[currentTab];

  React.useEffect(() => {
    setTicks(generateTicks(performanceChartData));
    setData(addFpsMetadata(performanceChartData));
  }, [currentTab]);

  const onDotClick = ({ index: pointer }: { index: number }) => {
    const point = _data[pointer];
    if (point) {
      player.jump(point.time);
    }
  };

  const onChartClick = (e: any) => {
    if (e === null) return;
    const { activeTooltipIndex } = e;
    const point = _data[activeTooltipIndex];
    if (point) {
      player.jump(point.time);
    }
  };

  const { fps, cpu, heap, nodes } = availability;
  const availableCount = [fps, cpu, heap, nodes].reduce(
    (c, av) => (av ? c + 1 : c),
    0,
  );
  const height = availableCount === 0 ? '0' : `${100 / availableCount}%`;

  return (
    <BottomBlock>
      <BottomBlock.Header>
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-3 items-center">
            <div className="font-semibold color-gray-medium mr-auto">
              {t('Performance')}
            </div>
            <InfoLine>
              <InfoLine.Point
                label="Device Heap Size"
                value={formatBytes(userDeviceHeapSize)}
                display
              />
            </InfoLine>
            <ConnectionQuality connection={connectionQuality} />
          </div>

          <div className="flex items-center gap-3">
            <Segmented
              options={[
                {
                  label: (
                    <TooltipANT title="Performance overview isn't supported across tabs.">
                      <span>{t('All Tabs')}</span>
                    </TooltipANT>
                  ),
                  value: 'all',
                  disabled: true,
                },
                { label: t('Current Tab'), value: 'current' },
              ]}
              defaultValue="current"
              size="small"
              className="rounded-full font-medium"
            />
          </div>
        </div>
      </BottomBlock.Header>
      <BottomBlock.Content>
        {fps && (
          <PerformanceAreaChart
              label="FPS"
              data={_data}
              cursorTime={performanceChartTime}
              cursorColor={CURSOR_COLOR}
              height={height}
              groupId="or-performance"
              ticks={_timeTicks}
              onPointClick={(i) => onDotClick({ index: i })}
              yMax={85}
              xFormatter={durationFromMsFormatted}
              tooltipFormatter={fpsTooltip(t)}
              bands={[
                { key: 'fps', color: FPS_COLOR, strokeColor: FPS_STROKE_COLOR, step: true, gradient: true },
                { key: 'fpsLowMarker', color: FPS_LOW_COLOR, step: true },
                { key: 'fpsVeryLowMarker', color: FPS_VERY_LOW_COLOR, step: true },
                { key: 'hiddenScreenMarker', color: HIDDEN_SCREEN_COLOR, step: true },
              ]}
            />
        )}
        {cpu && (
          <PerformanceAreaChart
              label="CPU"
              data={_data}
              cursorTime={performanceChartTime}
              cursorColor={CURSOR_COLOR}
              height={height}
              groupId="or-performance"
              ticks={_timeTicks}
              onPointClick={(i) => onDotClick({ index: i })}
              yMax={120}
              tooltipFormatter={cpuTooltip(t)}
              bands={[
                { key: 'cpu', color: CPU_COLOR, strokeColor: CPU_STROKE_COLOR, gradient: true },
                { key: 'hiddenScreenMarker', color: HIDDEN_SCREEN_COLOR, step: true },
              ]}
            />
        )}

        {heap && (
          <PerformanceAreaChart
              label="HEAP"
              data={_data}
              cursorTime={performanceChartTime}
              cursorColor={CURSOR_COLOR}
              height={height}
              groupId="or-performance"
              ticks={_timeTicks}
              onPointClick={(i) => onDotClick({ index: i })}
              yFormatter={formatBytes}
              yMaxRatio={1.2}
              tooltipFormatter={heapTooltip(t)}
              bands={[
                { key: 'totalHeap', color: 'transparent', strokeColor: TOTAL_HEAP_STROKE_COLOR, line: true },
                { key: 'usedHeap', color: USED_HEAP_COLOR, strokeColor: USED_HEAP_STROKE_COLOR, gradient: true },
              ]}
            />
        )}
        {nodes && (
          <PerformanceAreaChart
              label="NODES"
              data={_data}
              cursorTime={performanceChartTime}
              cursorColor={CURSOR_COLOR}
              height={height}
              groupId="or-performance"
              ticks={_timeTicks}
              onPointClick={(i) => onDotClick({ index: i })}
              yMaxRatio={1.2}
              tooltipFormatter={nodesCountTooltip(t)}
              bands={[
                { key: 'nodesCount', color: NODES_COUNT_COLOR, strokeColor: NODES_COUNT_STROKE_COLOR, gradient: true },
              ]}
            />
        )}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export const ConnectedPerformance = observer(Performance);
