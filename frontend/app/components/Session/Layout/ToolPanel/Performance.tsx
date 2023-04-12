import React from 'react';
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


const tooltipWrapperClass = "bg-white rounded border px-2 py-1";

const CPU_VISUAL_OFFSET = 10;

const FPS_COLOR = '#C5E5E7';
const FPS_STROKE_COLOR = "#92C7CA";
const FPS_LOW_COLOR = "pink";
const FPS_VERY_LOW_COLOR = "red";
const CPU_COLOR = "#A8D1DE"; 
const CPU_STROKE_COLOR = "#69A5B8";
const BATTERY_COLOR = "orange";
const BATTERY_STROKE_COLOR = "orange";
const USED_HEAP_COLOR = '#A9ABDC';
const USED_HEAP_STROKE_COLOR = "#8588CF";
const TOTAL_HEAP_STROKE_COLOR = '#4A4EB7';
const NODES_COUNT_COLOR = "#C6A9DC";
const NODES_COUNT_STROKE_COLOR = "#7360AC";
const HIDDEN_SCREEN_COLOR = "#CCC";


const CURSOR_COLOR = "#394EFF";

const Gradient = ({ color, id }) => (
  <linearGradient id={ id } x1="-1" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor={ color } stopOpacity={ 0.7 } />
    <stop offset="95%" stopColor={ color } stopOpacity={ 0.2 } />
  </linearGradient>
);


const TOTAL_HEAP = "Allocated Heap";
const USED_HEAP = "JS Heap";
const FPS = "Framerate";
const CPU = "CPU Load";
const MEMORY = "Memory Usage";
const BATTERY = "Battery Charge";
const NODES_COUNT = "Nodes Сount";


const FPSTooltip = ({ active, payload }) => {
  if (!active || payload.length < 3) {
    return null;
  }
  if (payload[0].value === null) {
    return (
      <div className={ tooltipWrapperClass } style={{ color: HIDDEN_SCREEN_COLOR }}>
        {"Page is not active. User switched the tab or hid the window."}
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
    <div className={ tooltipWrapperClass } style={ style }>
      <span className="font-medium">{`${ FPS }: `}</span>
      { Math.trunc(payload[0].value) }
    </div>
  );
};

const CPUTooltip = ({ active, payload }) => {
  if (!active || payload.length < 1 || payload[0].value === null) {
    return null;
  }
  return (
    <div className={ tooltipWrapperClass } >
      <span className="font-medium">{`${ CPU }: `}</span>
      { payload[0].value - CPU_VISUAL_OFFSET }
      {"%"}
    </div>
  );
};

const HeapTooltip = ({ active, payload }) => {
  if (!active || payload.length < 2) return null;
  return (
    <div className={ tooltipWrapperClass } >
      <p>
        <span className="font-medium">{`${ TOTAL_HEAP }: `}</span>
        { formatBytes(payload[0].value)}
      </p>
      <p>
        <span className="font-medium">{`${ USED_HEAP }: `}</span>
        { formatBytes(payload[1].value)}
      </p>
    </div>
  );
}

const MemoryTooltip = ({ active, payload}) => {
  if (!active || payload.length < 1) return null;
  return (
    <div className={ tooltipWrapperClass } >
      <span className="font-medium">{`${ MEMORY }: `}</span>
      { formatBytes(payload[0].value)}
    </div>
  );
}

const BatteryTooltip = ({ active, payload}) => {
  if (!active || payload.length < 1 || payload[0].value === null) {
    return null;
  }
  return (
    <div className={ tooltipWrapperClass } >
      <span className="font-medium">{`${ BATTERY }: `}</span>
      { payload[0].value  }
      {"%"}
    </div>
  );
}

const NodesCountTooltip = ({ active, payload } ) => {
  if (!active || payload.length === 0) return null;
  return (
    <div className={ tooltipWrapperClass } >
      <p>
        <span className="font-medium">{`${ NODES_COUNT }: `}</span>
        { payload[0].value }
      </p>
    </div>
  );
}

const TICKS_COUNT = 10;
function generateTicks(data: Array<Timed>): Array<number> {
  if (data.length === 0) return [];
  const minTime = data[0].time;
  const maxTime = data[data.length-1].time;

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
function adaptForGraphics(data) {
  return data.map((point, i) => {
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
    if (point.fps == null || 
      (i > 0 && data[i - 1].fps == null) //||
      //(i < data.length-1 && data[i + 1].fps == null)
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
    }
  });
}

export default class Performance extends React.PureComponent {
  _timeTicks = generateTicks(this.props.performanceChartData)
  _data = adaptForGraphics(this.props.performanceChartData)

  onDotClick = ({ index }) => {
    const point = this._data[index];
    if (!!point) {
      this.props.player.jump(point.time);
    }
  }

  onChartClick = (e) => {
    if (e === null) return;
    const { activeTooltipIndex } = e;
    const point = this._data[activeTooltipIndex];
    if (!!point) {
      this.props.player.jump(point.time);
    }
  }

  render() {
    const { 
      performanceChartTime,
      availability = {},
      hiddenScreenMarker = true,
    } = this.props;
    const { fps, cpu, heap, nodes, memory, battery } = availability;
    const availableCount = [ fps, cpu, heap, nodes, memory, battery ].reduce((c, av) => av ? c + 1 : c, 0);
    const height = availableCount === 0 ? "0" : `${100 / availableCount}%`;

    return (
      <>
        { fps &&
          <ResponsiveContainer height={ height }>
            <AreaChart
              onClick={ this.onChartClick }
              data={this._data}
              syncId="s"
              margin={{
                top: 0, right: 0, left: 0, bottom: 0,
              }}
            >
              <defs>
                <Gradient id="fpsGradient" color={ FPS_COLOR } />
              </defs>
              {/* <CartesianGrid strokeDasharray="1 1" stroke="#ddd" horizontal={ false } /> */}
              {/* <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" /> */}
              <XAxis 
                dataKey="time"
                type="number"
                mirror
                orientation="top"
                tickLine={ false }
                tickFormatter={ durationFromMsFormatted }
                tick={{ fontSize: "12px" }}
                domain={[0, 'dataMax']}
                ticks={this._timeTicks}
              >
                <Label value="FPS" position="insideRight" className="fill-gray-medium" />
              </XAxis>
              <YAxis
                axisLine={ false }
                tick={ false }
                mirror
                domain={[0, 85]}
              />
              {/* <YAxis */}
              {/*   yAxisId="r" */}
              {/*   axisLine={ false } */}
              {/*   tick={ false } */}
              {/*   mirror */}
              {/*   domain={[0, 120]} */}
              {/*   orientation="right" */}
              {/* /> */}
              <Area 
                dataKey="fps" 
                type="stepBefore" 
                stroke={FPS_STROKE_COLOR}
                fill="url(#fpsGradient)"
                dot={false}
                activeDot={{ 
                  onClick: this.onDotClick,
                  style: { cursor: "pointer" },
                }} 
                isAnimationActive={ false }
              /> 
              <Area
                dataKey="fpsLowMarker" 
                type="stepBefore"
                stroke="none"
                fill={ FPS_LOW_COLOR }
                activeDot={false}
                isAnimationActive={ false }
              />
              <Area 
                dataKey="fpsVeryLowMarker"
                type="stepBefore"
                stroke="none"
                fill={ FPS_VERY_LOW_COLOR }
                activeDot={false}
                isAnimationActive={ false }
              />
              { hiddenScreenMarker &&
                <Area
                  dataKey="hiddenScreenMarker"
                  type="stepBefore"
                  stroke="none"
                  fill={ HIDDEN_SCREEN_COLOR }
                  activeDot={false}
                  isAnimationActive={ false }
                />
              }
              {/*  <Area  */}
              {/*   yAxisId="r" */}
              {/*   dataKey="cpu"  */}
              {/*   type="monotone"  */}
              {/*   stroke={CPU_COLOR} */}
              {/*   fill="none" */}
              {/*   // fill="url(#fpsGradient)" */}
              {/*   dot={false} */}
              {/*   activeDot={{  */}
              {/*     onClick: this.onDotClick, */}
              {/*     style: { cursor: "pointer" }, */}
              {/*   }}  */}
              {/*   isAnimationActive={ false } */}
              {/* />  */}
              <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
              <Tooltip 
                content={FPSTooltip}
                filterNull={ false }
              />
            </AreaChart>
          </ResponsiveContainer>
        }
        { cpu &&
          <ResponsiveContainer height={ height }>
            <AreaChart
              onClick={ this.onChartClick }
              data={this._data}
              syncId="s"
              margin={{
                top: 0, right: 0, left: 0, bottom: 0,
              }}
            >
              <defs>
                <Gradient id="cpuGradient" color={ CPU_COLOR } />
              </defs>
              {/* <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" /> */}
              <XAxis 
                  dataKey="time"
                  type="number"
                  mirror
                  orientation="top"
                  tickLine={false}
                  tickFormatter={()=> ""}
                  domain={[0, 'dataMax']}
                  ticks={this._timeTicks}
                >
                  <Label value="CPU" position="insideRight" className="fill-gray-medium" />
              </XAxis>
              <YAxis
                axisLine={ false }
                tick={ false }
                mirror
                domain={[ 0, 120]}
                orientation="right"
              />
               <Area 
                dataKey="cpu" 
                type="monotone" 
                stroke={CPU_STROKE_COLOR}
                // fill="none"
                fill="url(#cpuGradient)"
                dot={false}
                activeDot={{ 
                  onClick: this.onDotClick,
                  style: { cursor: "pointer" },
                }} 
                isAnimationActive={ false }
              /> 
              { hiddenScreenMarker && 
                <Area
                  dataKey="hiddenScreenMarker"
                  type="stepBefore"
                  stroke="none"
                  fill={ HIDDEN_SCREEN_COLOR }
                  activeDot={false}
                  isAnimationActive={ false }
                />
              }
              <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
              <Tooltip 
                content={CPUTooltip}
                filterNull={ false }
              />
            </AreaChart>
          </ResponsiveContainer>
        }
        { battery &&
            <ResponsiveContainer height={ height }>
              <AreaChart
                onClick={ this.onChartClick }
                data={this._data}
                syncId="s"
                margin={{
                  top: 0, right: 0, left: 0, bottom: 0,
                }}
              >
                <defs>
                  <Gradient id="batteryGrad" color={ BATTERY_COLOR } />
                </defs>
                {/* <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" /> */}
                <XAxis 
                    dataKey="time"
                    type="number"
                    mirror
                    orientation="top"
                    tickLine={false}
                    tickFormatter={()=> ""}
                    domain={[0, 'dataMax']}
                    ticks={this._timeTicks}
                  >
                    <Label value="BATTERY" position="insideTopRight" className="fill-gray-medium" />
                </XAxis>
                <YAxis
                  axisLine={ false }
                  tick={ false }
                  mirror
                  domain={[ 0, 120]}
                  orientation="right"
                />
                 <Area 
                  dataKey="battery" 
                  type="monotone" 
                  stroke={BATTERY_STROKE_COLOR}
                  // fill="none"
                  fill="url(#batteryGrad)"
                  dot={false}
                  activeDot={{ 
                    onClick: this.onDotClick,
                    style: { cursor: "pointer" },
                  }} 
                  isAnimationActive={ false }
                /> 
                <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
                <Tooltip 
                  content={BatteryTooltip}
                  filterNull={ false }
                />
              </AreaChart>
            </ResponsiveContainer>
          }
          { memory &&
            <ResponsiveContainer height={ height }>
              <AreaChart
                onClick={ this.onChartClick }
                data={this._data}
                syncId="s"
                margin={{
                  top: 0, right: 0, left: 0, bottom: 0,
                }}
              >
                <defs>
                  <Gradient id="usedHeapGradient" color={ USED_HEAP_COLOR } />
                </defs>
                {/* <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" /> */}
                <XAxis 
                    dataKey="time"
                    type="number"
                    mirror
                    orientation="top"
                    tickLine={false}
                    tickFormatter={()=> ""}
                    domain={[0, 'dataMax']}
                    ticks={this._timeTicks}
                  >
                    <Label value="MEMORY" position="insideTopRight" className="fill-gray-medium" />
                </XAxis>
                <YAxis
                  axisLine={false}
                  tickFormatter={formatBytes}
                  mirror
                  // Hack to keep only end tick
                  minTickGap={Number.MAX_SAFE_INTEGER}
                  domain={[0, max => max*1.2]}
                />
                 <Area 
                  dataKey="memory" 
                  type="monotone" 
                  stroke={USED_HEAP_STROKE_COLOR}
                  // fill="none"
                  fill="url(#usedHeapGradient)"
                  dot={false}
                  activeDot={{ 
                    onClick: this.onDotClick,
                    style: { cursor: "pointer" },
                  }} 
                  isAnimationActive={ false }
                /> 
                <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
                <Tooltip 
                  content={MemoryTooltip}
                  filterNull={ false }
                />
              </AreaChart>
            </ResponsiveContainer>
          }

        { heap &&
          <ResponsiveContainer height={ height }>
            <ComposedChart
              onClick={ this.onChartClick }
              data={this._data}
              margin={{
                top: 0, right: 0, left: 0, bottom: 0,
              }}
              syncId="s"
            >
              <defs>
                <Gradient id="usedHeapGradient" color={ USED_HEAP_COLOR } />
              </defs>
              {/* <CartesianGrid strokeDasharray="1 1" stroke="#ddd" horizontal={ false }  /> */}
              <XAxis 
                dataKey="time"
                type="number"
                mirror
                orientation="top"
                tickLine={false}
                tickFormatter={()=> ""} // tick={false} + this._timeTicks to cartesian array
                domain={[0, 'dataMax']}
                ticks={this._timeTicks}
              >
                <Label value="HEAP" position="insideRight" className="fill-gray-medium" />
              </XAxis>
              <YAxis
                axisLine={false}
                tickFormatter={formatBytes}
                mirror
                // Hack to keep only end tick
                minTickGap={Number.MAX_SAFE_INTEGER}
                domain={[0, max => max*1.2]}
              />
              <Line 
                type="monotone"
                dataKey="totalHeap"
                // fill="url(#totalHeapGradient)"
                stroke={TOTAL_HEAP_STROKE_COLOR}
                dot={false}
                activeDot={{ 
                  onClick: this.onDotClick,
                  style: { cursor: "pointer" },
                }}
                isAnimationActive={ false }
              />
              <Area
                dataKey="usedHeap"
                type="monotone"
                fill="url(#usedHeapGradient)"
                stroke={USED_HEAP_STROKE_COLOR}
                dot={false}
                activeDot={{ 
                  onClick: this.onDotClick,
                  style: { cursor: "pointer" },
                }} 
                isAnimationActive={ false }
              />
              <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
              <Tooltip 
                content={HeapTooltip}
                filterNull={ false }
              />
            </ComposedChart>
          </ResponsiveContainer>
        }
        { nodes &&
          <ResponsiveContainer height={ height }>
            <AreaChart
              onClick={ this.onChartClick }
              data={this._data}
              syncId="s"
              margin={{
                top: 0, right: 0, left: 0, bottom: 0,
              }}
            >
              <defs>
                <Gradient id="nodesGradient" color={ NODES_COUNT_COLOR } />
              </defs>
              {/* <CartesianGrid strokeDasharray="1 1" stroke="#ddd" horizontal={ false } /> */}
              <XAxis 
                  dataKey="time"
                  type="number"
                  mirror
                  orientation="top"
                  tickLine={false}
                  tickFormatter={()=> ""}
                  domain={[0, 'dataMax']}
                  ticks={this._timeTicks}
                >
                  <Label value="NODES" position="insideRight" className="fill-gray-medium" />
              </XAxis>
              <YAxis
                axisLine={ false }
                tick={ false }
                mirror
                orientation="right"
                domain={[0, max => max*1.2]}
              />
               <Area 
                dataKey="nodesCount" 
                type="monotone" 
                stroke={NODES_COUNT_STROKE_COLOR}
                // fill="none"
                fill="url(#nodesGradient)"
                dot={false}
                activeDot={{ 
                  onClick: this.onDotClick,
                  style: { cursor: "pointer" },
                }} 
                isAnimationActive={ false }
              /> 
              <ReferenceLine x={performanceChartTime} stroke={CURSOR_COLOR} />
              <Tooltip 
                content={NodesCountTooltip}
                filterNull={ false }
              />
            </AreaChart>
          </ResponsiveContainer>
        }
      </>
    );
  }
}
