import React, { useState } from 'react';
import { Icon, Tooltip as AppTooltip } from 'UI';
import { numberCompact } from 'App/utils';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,

} from 'recharts';
import { connect } from 'react-redux';
import { setActiveStages } from 'Duck/funnels';
import { Styles } from '../../Dashboard/Widgets/common';
import { numberWithCommas } from 'App/utils';
import { truncate } from 'App/utils';

const MIN_BAR_HEIGHT = 20;

function CustomTick(props) {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} fontSize={12} textAnchor="middle" fill="#666">
        {payload.value}
      </text>
    </g>
  );
}

function FunnelGraph(props) {
  const { data, activeStages, funnelId, liveFilters } = props;
  const [activeIndex, setActiveIndex] = useState(activeStages);

  const renderPercentage = (props) => {
    const { x, y, width, height, value } = props;
    const radius = 10;
    const _x = x + width / 2 + 45;

    return (
      <g>
        <svg width="46px" height="21px" version="1.1">
          <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <path
              d="M37.2387001,0.5 L45.3588127,10.5034561 L37.4215407,20.5 L0.5,20.5 L0.5,0.5 L37.2387001,0.5 Z"
              id="Rectangle"
              stroke="#AFACAC"
              fill="#FFFFFF"
            ></path>
          </g>
        </svg>
        <text x={x} y={70} fill="#000" textAnchor="middle" dominantBaseline="middle">
          {numberCompact(value)}
        </text>
      </g>
    );
  };

  const renderCustomizedLabel = (props) => {
    const { x, y, width, height, value, textColor = '#fff' } = props;
    const radius = 10;

    if (value === 0) return;

    return (
      <g>
        <text
          x={x + width / 2}
          y={y - radius + 20}
          fill={textColor}
          font-size="12"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {numberCompact(value)}
        </text>
      </g>
    );
  };

  const handleClick = (data, index) => {
    if (activeStages.length === 1 && activeStages.includes(index)) {
      // selecting the same bar
      props.setActiveStages([], null);
      return;
    }

    if (activeStages.length === 2) {
      // already having two bars
      return;
    }

    // new selection
    const arr = activeStages.concat([index]);
    props.setActiveStages(arr.sort(), arr.length === 2 && liveFilters, funnelId);
  };

  const resetActiveSatges = () => {
    props.setActiveStages([], liveFilters, funnelId, true);
  };

  const renderDropLabel = ({ x, y, width, value }) => {
    if (value === 0) return;
    return (
      <text fill="#cc0000" x={x + width / 2} y={y - 5} textAnchor="middle" fontSize="12">
        {value}
      </text>
    );
  };

  const renderMainLabel = ({ x, y, width, value }) => {
    return (
      <text fill="#FFFFFF" x={x + width / 2} y={y + 14} textAnchor="middle" fontSize="12">
        {numberWithCommas(value)}
      </text>
    );
  };

  const CustomBar = (props) => {
    const { fill, x, y, width, height, sessionsCount, index, dropDueToIssues } = props;
    const yp = sessionsCount < MIN_BAR_HEIGHT ? MIN_BAR_HEIGHT - 1 : dropDueToIssues;
    const tmp = (height <= 20 ? 20 : height) - (TEMP[index].height > 20 ? 0 : TEMP[index].height);
    return (
      <svg>
        <rect x={x} y={y} width={width} height={tmp} fill={fill} />
      </svg>
    );
  };
  const MainBar = (props) => {
    const {
      fill,
      x,
      y,
      width,
      height,
      sessionsCount,
      index,
      dropDueToIssues,
      hasSelection = false,
    } = props;
    const yp = sessionsCount < MIN_BAR_HEIGHT ? MIN_BAR_HEIGHT - 1 : dropDueToIssues;

    TEMP[index] = { height, y };

    return (
      <svg style={{ cursor: hasSelection ? '' : 'pointer' }}>
        <rect x={x} y={y} width={width} height={height} fill={fill} />
      </svg>
    );
  };

  const renderDropPct = (props) => {
    // TODO
    const { fill, x, y, width, height, value, totalBars } = props;
    const barW = x + 730 / totalBars / 2;

    return (
      <svg>
        <rect x={barW} y={80} width={width} height={20} fill="red" />
      </svg>
    );
  };

  const CustomTooltip = (props) => {
    const { payload } = props;
    if (payload.length === 0) return null;
    const { value, headerText } = payload[0].payload;

    // const value = payload[0].payload.value;
    if (!value) return null;
    return (
      <div className="rounded border bg-white p-2">
        <div>{headerText}</div>
        {value.map((i) => (
          <div className="text-sm ml-2">{truncate(i, 30)}</div>
        ))}
      </div>
    );
  };
  // const CustomTooltip = ({ active, payload, msg = ''  }) => {
  //   return (
  //     <div className="rounded border bg-white p-2">
  //       <p className="text-sm">{msg}</p>
  //     </div>
  //   );
  // };

  const TEMP = {};

  return (
    <div className="relative">
      {activeStages.length === 2 && (
        <div
          className="absolute right-0 top-0 cursor-pointer z-10"
          style={{ marginRight: '60px', marginTop: '0' }}
          onClick={resetActiveSatges}
        >
          <AppTooltip title={`Reset Selection`}>
            <Icon name="sync-alt" size="15" color="teal" />
          </AppTooltip>
        </div>
      )}
      <BarChart
        width={800}
        height={190}
        data={data}
        margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
        background={'transparent'}
      >
        <CartesianGrid strokeDasharray="1 3" stroke="#BBB" vertical={false} />
        {/* {activeStages.length < 2 && <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip msg={activeStages.length > 0 ? 'Select one more event.' : 'Select any two events to analyze in depth.'} />} />} */}
        <Tooltip cursor={{ fill: 'transparent' }} content={CustomTooltip} />

        <Bar
          dataKey="sessionsCount"
          onClick={handleClick}
          maxBarSize={80}
          stackId="a"
          shape={<MainBar hasSelection={activeStages.length === 2} />}
          cursor="pointer"
          minPointSize={MIN_BAR_HEIGHT}
          background={false}
        >
          <LabelList dataKey="sessionsCount" content={renderMainLabel} />
          {data.map((entry, index) => {
            const selected =
              activeStages.includes(index) || (index > activeStages[0] && index < activeStages[1]);
            const opacity = activeStages.length > 0 && !selected ? 0.4 : 1;
            return (
              <Cell
                cursor="pointer"
                fill={selected ? '#394EFF' : opacity === 1 ? '#3EAAAF' : '#CCC'}
                key={`cell-${index}`}
              />
            );
          })}
        </Bar>

        <Bar
          hide={activeStages.length !== 2}
          dataKey="dropDueToIssues"
          onClick={handleClick}
          maxBarSize={80}
          stackId="a"
          shape={<CustomBar />}
          minPointSize={MIN_BAR_HEIGHT}
        >
          <LabelList dataKey="dropDueToIssues" content={renderDropLabel} />
          {data.map((entry, index) => {
            const selected =
              activeStages.includes(index) || (index > activeStages[0] && index < activeStages[1]);
            const opacity = activeStages.length > 0 && !selected ? 0.4 : 1;
            return (
              <Cell
                opacity={opacity}
                cursor="pointer"
                fill={activeStages[1] === index ? '#cc000040' : 'transparent'}
                key={`cell-${index}`}
              />
            );
          })}
        </Bar>

        <XAxis
          stroke={0}
          dataKey="label"
          strokeWidth={0}
          interval={0}
          // tick ={{ fill: '#666', fontSize: 12 }}
          tick={<CustomTick />}
          xAxisId={0}
        />
        {/* <XAxis
            stroke={0}
            xAxisId={1} 
            dataKey="value"
            strokeWidth={0}
            interval={0}
            dy={-15} dx={0}
            tick ={{ fill: '#666', fontSize: 12 }}
            tickFormatter={val => '"' + val + '"'}
          /> */}
        <YAxis
          interval={0}
          strokeWidth={0}
          tick={{ fill: '#999999', fontSize: 11 }}
          tickFormatter={(val) => Styles.tickFormatter(val)}
        />
      </BarChart>
    </div>
  );
}

export default connect(
  (state) => ({
    activeStages: state.getIn(['funnels', 'activeStages']).toJS(),
    liveFilters: state.getIn(['funnelFilters', 'appliedFilter']),
  }),
  { setActiveStages }
)(FunnelGraph);
