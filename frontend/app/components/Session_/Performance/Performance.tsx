import { Timed } from 'Player';
import { PerformanceChartPoint } from 'Player/mobile/managers/IOSPerformanceTrackManager';
import React, { useTransition } from 'react';
import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from 'recharts';
import { durationFromMsFormatted } from 'App/date';
import { formatBytes } from 'App/utils';
import { Tooltip as TooltipANT, Segmented } from 'antd';

import { useStore } from 'App/mstore';
import stl from './performance.module.css';

import BottomBlock from '../BottomBlock';
import InfoLine from '../BottomBlock/InfoLine';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

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

function Gradient({ color, id }) {
  return (
    <linearGradient id={id} x1="-1" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor={color} stopOpacity={0.7} />
      <stop offset="95%" stopColor={color} stopOpacity={0.2} />
    </linearGradient>
  );
}

const TOTAL_HEAP = (t: TFunction) => t('Allocated Heap');
const USED_HEAP = (t: TFunction) => t('JS Heap');
const FPS = (t: TFunction) => t('Framerate');
const CPU = (t: TFunction) => t('CPU Load');
const NODES_COUNT = (t: TFunction) => t('Nodes Сount');

function FPSTooltip({ active, payload }) {
  const { t } = useTranslation();
  if (!payload) return null;
  if (!active || !payload || payload.length < 3) {
    return null;
  }
  if (payload[0].value === null) {
    return (
      <div
        className={stl.tooltipWrapper}
        style={{ color: HIDDEN_SCREEN_COLOR }}
      >
        {t('Page is not active. User switched the tab or hid the window.')}
      </div>
    );
  }

  let style;
  if (payload[1].value != null && payload[1].value > 0) {
    style = { color: FPS_LOW_COLOR };
  }
  if (payload[2].value != null && payload[2].value > 0) {
    style = { color: FPS_VERY_LOW_COLOR };
  }

  return (
    <div className={stl.tooltipWrapper} style={style}>
      <span className="font-medium">{`${FPS(t)}: `}</span>
      {Math.trunc(payload[0].value)}
    </div>
  );
}

function CPUTooltip({ active, payload }) {
  const { t } = useTranslation();
  if (!payload) return null;
  if (!active || payload.length < 1 || payload[0].value === null) {
    return null;
  }
  return (
    <div className={stl.tooltipWrapper}>
      <span className="font-medium">{`${CPU(t)}: `}</span>
      {payload[0].value - CPU_VISUAL_OFFSET}%
    </div>
  );
}

function MobileCpuTooltip({ active, payload }) {
  const { t } = useTranslation();

  if (!payload) return null;
  if (!active || payload.length < 1) {
    return null;
  }
  if (payload[0].value === null) {
    return (
      <div
        className={stl.tooltipWrapper}
        style={{ color: HIDDEN_SCREEN_COLOR }}
      >
        {t('App is in the background.')}
      </div>
    );
  }
  return (
    <div className={stl.tooltipWrapper}>
      <span className="font-medium">{`${CPU(t)}: `}</span>
      {payload[0].value}%
    </div>
  );
}

function HeapTooltip({ active, payload }) {
  const { t } = useTranslation();
  if (!payload) return null;
  if (!active || payload.length < 2) return null;
  return (
    <div className={stl.tooltipWrapper}>
      <p>
        <span className="font-medium">{`${TOTAL_HEAP(t)}: `}</span>
        {formatBytes(payload[0].value)}
      </p>
      <p>
        <span className="font-medium">{`${USED_HEAP(t)}: `}</span>
        {formatBytes(payload[1].value)}
      </p>
    </div>
  );
}

function MobileMemoryTooltip({ active, payload }) {
  const { t } = useTranslation();
  if (!payload) return null;
  if (!active || payload.length < 1 || payload[1].value === null) return null;
  return (
    <div className={stl.tooltipWrapper}>
      <p>
        <span className="font-medium">{t('Used Memory: ')}</span>
        {formatBytes(payload[1].value)}
      </p>
    </div>
  );
}

function NodesCountTooltip({ active, payload }) {
  const { t } = useTranslation();
  if (!payload) return null;
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={stl.tooltipWrapper}>
      <p>
        <span className="font-medium">{`${NODES_COUNT(t)}: `}</span>
        {payload[0].value}
      </p>
    </div>
  );
}

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
        <ResponsiveContainer height={height}>
          <AreaChart
            onClick={onChartClick}
            data={_data}
            syncId="s"
            margin={{
              top: 0,
              right: 0,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <Gradient id="cpuGradient" color={CPU_COLOR} />
            </defs>
            {/* <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" /> */}
            <XAxis
              dataKey="time"
              type="number"
              mirror
              orientation="top"
              tickLine={false}
              tickFormatter={() => ''}
              domain={[0, 'dataMax']}
              ticks={_timeTicks}
            >
              <Label
                value="CPU"
                position="insideTopRight"
                className="fill-gray-darkest"
              />
            </XAxis>
            <YAxis
              axisLine={false}
              tick={false}
              mirror
              domain={[0, 120]}
              orientation="right"
            />
            <Area
              dataKey="cpu"
              type="monotone"
              stroke={CPU_STROKE_COLOR}
              fill="url(#cpuGradient)"
              dot={false}
              activeDot={{
                onClick: onDotClick,
                style: { cursor: 'pointer' },
              }}
              isAnimationActive={false}
            />
            <Area
              dataKey="isBackground"
              type="stepBefore"
              stroke="none"
              fill={HIDDEN_SCREEN_COLOR}
              activeDot={false}
              isAnimationActive={false}
            />
            <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
            <Tooltip content={MobileCpuTooltip} filterNull={false} />
          </AreaChart>
        </ResponsiveContainer>
        <ResponsiveContainer height={height}>
          <ComposedChart
            onClick={onChartClick}
            data={_data}
            margin={{
              top: 0,
              right: 0,
              left: 0,
              bottom: 0,
            }}
            syncId="s"
          >
            <defs>
              <Gradient id="usedHeapGradient" color={USED_HEAP_COLOR} />
            </defs>
            <XAxis
              dataKey="time"
              type="number"
              mirror
              orientation="top"
              tickLine={false}
              tickFormatter={() => ''} // tick={false} + _timeTicks to cartesian array
              domain={[0, 'dataMax']}
              ticks={_timeTicks}
            >
              <Label
                value="Memory"
                position="insideTopRight"
                className="fill-gray-darkest"
              />
            </XAxis>
            <YAxis
              axisLine={false}
              tickFormatter={formatBytes}
              mirror
              // Hack to keep only end tick
              minTickGap={Number.MAX_SAFE_INTEGER}
              domain={[0, (max: number) => max * 1.2]}
            />
            {/* <Line */}
            {/*    type="monotone" */}
            {/*    dataKey="totalHeap" */}
            {/*    stroke={TOTAL_HEAP_STROKE_COLOR} */}
            {/*    dot={false} */}
            {/*    activeDot={{ */}
            {/*      onClick: onDotClick, */}
            {/*      style: { cursor: 'pointer' }, */}
            {/*    }} */}
            {/*    isAnimationActive={false} */}
            {/* /> */}
            <Area
              dataKey="isMemBackground"
              type="stepBefore"
              stroke="none"
              fill={HIDDEN_SCREEN_COLOR}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              dataKey="memory"
              type="monotone"
              fill="url(#usedHeapGradient)"
              stroke={USED_HEAP_STROKE_COLOR}
              dot={false}
              activeDot={{
                onClick: onDotClick,
                style: { cursor: 'pointer' },
              }}
              isAnimationActive={false}
            />
            <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
            <Tooltip content={MobileMemoryTooltip} filterNull={false} />
          </ComposedChart>
        </ResponsiveContainer>
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
          <ResponsiveContainer height={height}>
            <AreaChart
              onClick={onChartClick}
              data={_data}
              syncId="s"
              margin={{
                top: 0,
                right: 0,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <Gradient id="fpsGradient" color={FPS_COLOR} />
              </defs>
              <XAxis
                dataKey="time"
                type="number"
                mirror
                orientation="top"
                tickLine={false}
                tickFormatter={durationFromMsFormatted}
                tick={{ fontSize: '12px', fill: '#333' }}
                domain={[0, 'dataMax']}
                ticks={_timeTicks}
              >
                <Label
                  value="FPS"
                  position="insideTopRight"
                  className="fill-gray-darkest"
                />
              </XAxis>
              <YAxis axisLine={false} tick={false} mirror domain={[0, 85]} />
              <Area
                dataKey="fps"
                type="stepBefore"
                stroke={FPS_STROKE_COLOR}
                fill="url(#fpsGradient)"
                dot={false}
                activeDot={{
                  onClick: onDotClick,
                  style: { cursor: 'pointer' },
                }}
                isAnimationActive={false}
              />
              <Area
                dataKey="fpsLowMarker"
                type="stepBefore"
                stroke="none"
                fill={FPS_LOW_COLOR}
                activeDot={false}
                isAnimationActive={false}
              />
              <Area
                dataKey="fpsVeryLowMarker"
                type="stepBefore"
                stroke="none"
                fill={FPS_VERY_LOW_COLOR}
                activeDot={false}
                isAnimationActive={false}
              />
              <Area
                dataKey="hiddenScreenMarker"
                type="stepBefore"
                stroke="none"
                fill={HIDDEN_SCREEN_COLOR}
                activeDot={false}
                isAnimationActive={false}
              />
              <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
              <Tooltip content={FPSTooltip} filterNull={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {cpu && (
          <ResponsiveContainer height={height}>
            <AreaChart
              onClick={onChartClick}
              data={_data}
              syncId="s"
              margin={{
                top: 0,
                right: 0,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <Gradient id="cpuGradient" color={CPU_COLOR} />
              </defs>
              {/* <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" /> */}
              <XAxis
                dataKey="time"
                type="number"
                mirror
                orientation="top"
                tickLine={false}
                tickFormatter={() => ''}
                domain={[0, 'dataMax']}
                ticks={_timeTicks}
              >
                <Label
                  value="CPU"
                  position="insideTopRight"
                  className="fill-gray-darkest"
                />
              </XAxis>
              <YAxis
                axisLine={false}
                tick={false}
                mirror
                domain={[0, 120]}
                orientation="right"
              />
              <Area
                dataKey="cpu"
                type="monotone"
                stroke={CPU_STROKE_COLOR}
                fill="url(#cpuGradient)"
                dot={false}
                activeDot={{
                  onClick: onDotClick,
                  style: { cursor: 'pointer' },
                }}
                isAnimationActive={false}
              />
              <Area
                dataKey="hiddenScreenMarker"
                type="stepBefore"
                stroke="none"
                fill={HIDDEN_SCREEN_COLOR}
                activeDot={false}
                isAnimationActive={false}
              />
              <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
              <Tooltip content={CPUTooltip} filterNull={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {heap && (
          <ResponsiveContainer height={height}>
            <ComposedChart
              onClick={onChartClick}
              data={_data}
              margin={{
                top: 0,
                right: 0,
                left: 0,
                bottom: 0,
              }}
              syncId="s"
            >
              <defs>
                <Gradient id="usedHeapGradient" color={USED_HEAP_COLOR} />
              </defs>
              <XAxis
                dataKey="time"
                type="number"
                mirror
                orientation="top"
                tickLine={false}
                tickFormatter={() => ''} // tick={false} + _timeTicks to cartesian array
                domain={[0, 'dataMax']}
                ticks={_timeTicks}
              >
                <Label
                  value="HEAP"
                  position="insideTopRight"
                  className="fill-gray-darkest"
                />
              </XAxis>
              <YAxis
                axisLine={false}
                tickFormatter={formatBytes}
                mirror
                // Hack to keep only end tick
                minTickGap={Number.MAX_SAFE_INTEGER}
                domain={[0, (max: number) => max * 1.2]}
              />
              <Line
                type="monotone"
                dataKey="totalHeap"
                stroke={TOTAL_HEAP_STROKE_COLOR}
                dot={false}
                activeDot={{
                  onClick: onDotClick,
                  style: { cursor: 'pointer' },
                }}
                isAnimationActive={false}
              />
              <Area
                dataKey="usedHeap"
                type="monotone"
                fill="url(#usedHeapGradient)"
                stroke={USED_HEAP_STROKE_COLOR}
                dot={false}
                activeDot={{
                  onClick: onDotClick,
                  style: { cursor: 'pointer' },
                }}
                isAnimationActive={false}
              />
              <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
              <Tooltip content={HeapTooltip} filterNull={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        {nodes && (
          <ResponsiveContainer height={height}>
            <AreaChart
              onClick={onChartClick}
              data={_data}
              syncId="s"
              margin={{
                top: 0,
                right: 0,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <Gradient id="nodesGradient" color={NODES_COUNT_COLOR} />
              </defs>
              <XAxis
                dataKey="time"
                type="number"
                mirror
                orientation="top"
                tickLine={false}
                tickFormatter={() => ''}
                domain={[0, 'dataMax']}
                ticks={_timeTicks}
              >
                <Label
                  value="NODES"
                  position="insideTopRight"
                  className="fill-gray-darkest"
                />
              </XAxis>
              <YAxis
                axisLine={false}
                tick={false}
                mirror
                orientation="right"
                domain={[0, (max: number) => max * 1.2]}
              />
              <Area
                dataKey="nodesCount"
                type="monotone"
                stroke={NODES_COUNT_STROKE_COLOR}
                fill="url(#nodesGradient)"
                dot={false}
                activeDot={{
                  onClick: onDotClick,
                  style: { cursor: 'pointer' },
                }}
                isAnimationActive={false}
              />
              <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
              <Tooltip content={NodesCountTooltip} filterNull={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export const ConnectedPerformance = observer(Performance);
