import { Tooltip } from '@/ui/overlays/tooltip';
import { darkTokens, lightTokens } from '@/ui/styles/token-values';
import { Timed } from 'Player';
import { PerformanceChartPoint } from 'Player/mobile/managers/IOSPerformanceTrackManager';
import { TFunction } from 'i18next';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from 'App/ThemeContext';
import ConnectionQuality from 'App/components/Session/Player/ReplayPlayer/ConnectionQuality';
import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { durationFromMsFormatted } from 'App/date';
import { useStore } from 'App/mstore';
import { formatBytes } from 'App/utils';
import PerformanceAreaChart, {
  PerfBand,
} from 'Components/Charts/PerformanceAreaChart';

import { NoData } from 'Shared/DevTools/PanelKit';

import BottomBlock from '../BottomBlock';
import stl from './performance.module.css';

const CPU_VISUAL_OFFSET = 10;

const FPS_LOW_COLOR = 'var(--m-content-warning)';
const FPS_VERY_LOW_COLOR = 'var(--m-content-danger)';
const HIDDEN_SCREEN_COLOR = 'var(--m-content-disabled)';

/* Canvas charts need resolved colours, so the bands are built per theme. */
function perfBands(c: Record<string, string>) {
  const line = c['border-accent'];
  const hidden = c['content-disabled'];
  const area = (key: string, extra: Partial<PerfBand> = {}): PerfBand => ({
    key,
    color: line,
    strokeColor: line,
    gradient: true,
    ...extra,
  });
  return {
    cursor: c['content-accent'],
    fps: [
      area('fps', { step: true }),
      { key: 'fpsLowMarker', color: c['content-warning'], step: true },
      { key: 'fpsVeryLowMarker', color: c['content-danger'], step: true },
      { key: 'hiddenScreenMarker', color: hidden, step: true },
    ],
    cpu: [
      area('cpu'),
      { key: 'hiddenScreenMarker', color: hidden, step: true },
    ],
    heap: [
      {
        key: 'totalHeap',
        color: 'transparent',
        strokeColor: c['content-accent'],
        line: true,
      },
      area('usedHeap'),
    ],
    nodes: [area('nodesCount')],
    mobileCpu: [
      area('cpu'),
      { key: 'isBackground', color: hidden, step: true },
    ],
    mobileMemory: [
      { key: 'isMemBackground', color: hidden, step: true },
      area('memory'),
    ],
  } satisfies Record<string, PerfBand[] | string>;
}

function usePerfBands() {
  const { theme } = useTheme();
  return React.useMemo(
    () => perfBands(theme === 'dark' ? darkTokens : lightTokens),
    [theme],
  );
}

const TOTAL_HEAP = (t: TFunction) => t('Allocated Heap');
const USED_HEAP = (t: TFunction) => t('JS Heap');
const FPS = (t: TFunction) => t('Framerate');
const CPU = (t: TFunction) => t('CPU Load');
const NODES_COUNT = (t: TFunction) => t('Nodes Сount');

const tipWrap = (inner: string, style = '') =>
  // `!important` because .tooltipWrapper declares its own colour the same way.
  `<div class="${stl.tooltipWrapper}"${style ? ` style="${style} !important"` : ''}>${inner}</div>`;
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
    return tipWrap(
      t('App is in the background.'),
      `color:${HIDDEN_SCREEN_COLOR}`,
    );
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
  const bands = usePerfBands();
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
  }, [performanceChartData.length]);

  const onDotClick = ({ index: pointer }: { index: number }) => {
    const point = _data[pointer];
    if (point) {
      player.jump(point.time);
    }
  };

  const memorySize = Number(sessionStore.current.userDeviceMemorySize);
  const availableCount = 2;
  const height = `${100 / availableCount}%`;

  return (
    <BottomBlock>
      <BottomBlock.Header>
        {memorySize > 0 ? (
          <p className="m-dt__figures m-dt__figures--inline">
            <span>
              {t('Device memory size')} <b>{formatBytes(memorySize * 1024)}</b>
            </span>
          </p>
        ) : (
          <span />
        )}
      </BottomBlock.Header>
      <BottomBlock.Content
        className={_data.length ? 'm-dt__charts' : undefined}
      >
        {_data.length === 0 ? (
          <NoData hint={t('This recording has no performance data.')} />
        ) : (
          <>
            <PerformanceAreaChart
              label={t('CPU')}
              data={_data}
              cursorTime={performanceChartTime}
              cursorColor={bands.cursor}
              height={height}
              groupId="or-performance"
              ticks={_timeTicks}
              onPointClick={(i) => onDotClick({ index: i })}
              yMax={120}
              tooltipFormatter={mobileCpuTooltip(t)}
              bands={bands.mobileCpu}
            />
            <PerformanceAreaChart
              label={t('Memory')}
              data={_data}
              cursorTime={performanceChartTime}
              cursorColor={bands.cursor}
              height={height}
              groupId="or-performance"
              ticks={_timeTicks}
              onPointClick={(i) => onDotClick({ index: i })}
              yFormatter={formatBytes}
              yMaxRatio={1.2}
              tooltipFormatter={mobileMemoryTooltip(t)}
              bands={bands.mobileMemory}
            />
          </>
        )}
      </BottomBlock.Content>
    </BottomBlock>
  );
});

function Performance() {
  const { t } = useTranslation();
  const bands = usePerfBands();
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

  const { fps, cpu, heap, nodes } = availability;
  const availableCount = [fps, cpu, heap, nodes].reduce(
    (c, av) => (av ? c + 1 : c),
    0,
  );
  const height = availableCount === 0 ? '0' : `${100 / availableCount}%`;

  return (
    <BottomBlock>
      <BottomBlock.Header>
        <p className="m-dt__figures m-dt__figures--inline">
          <span>
            {t('Device heap size')} <b>{formatBytes(userDeviceHeapSize)}</b>
          </span>
          <ConnectionQuality connection={connectionQuality} />
        </p>
        <div className="m-dt__bar-right">
          <Tooltip
            title={t("Performance overview isn't supported across tabs.")}
          >
            <span className="m-dt__figrow-note">{t('Current tab')}</span>
          </Tooltip>
        </div>
      </BottomBlock.Header>
      <BottomBlock.Content className="m-dt__charts">
        {fps && (
          <PerformanceAreaChart
            label="FPS"
            data={_data}
            cursorTime={performanceChartTime}
            cursorColor={bands.cursor}
            height={height}
            groupId="or-performance"
            ticks={_timeTicks}
            onPointClick={(i) => onDotClick({ index: i })}
            yMax={85}
            xFormatter={durationFromMsFormatted}
            tooltipFormatter={fpsTooltip(t)}
            bands={bands.fps}
          />
        )}
        {cpu && (
          <PerformanceAreaChart
            label="CPU"
            data={_data}
            cursorTime={performanceChartTime}
            cursorColor={bands.cursor}
            height={height}
            groupId="or-performance"
            ticks={_timeTicks}
            onPointClick={(i) => onDotClick({ index: i })}
            yMax={120}
            tooltipFormatter={cpuTooltip(t)}
            bands={bands.cpu}
          />
        )}

        {heap && (
          <PerformanceAreaChart
            label="HEAP"
            data={_data}
            cursorTime={performanceChartTime}
            cursorColor={bands.cursor}
            height={height}
            groupId="or-performance"
            ticks={_timeTicks}
            onPointClick={(i) => onDotClick({ index: i })}
            yFormatter={formatBytes}
            yMaxRatio={1.2}
            tooltipFormatter={heapTooltip(t)}
            bands={bands.heap}
          />
        )}
        {nodes && (
          <PerformanceAreaChart
            label="NODES"
            data={_data}
            cursorTime={performanceChartTime}
            cursorColor={bands.cursor}
            height={height}
            groupId="or-performance"
            ticks={_timeTicks}
            onPointClick={(i) => onDotClick({ index: i })}
            yMaxRatio={1.2}
            tooltipFormatter={nodesCountTooltip(t)}
            bands={bands.nodes}
          />
        )}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export const ConnectedPerformance = observer(Performance);
