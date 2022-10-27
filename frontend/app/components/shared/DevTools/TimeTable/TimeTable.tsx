import React from 'react';
import { List, AutoSizer } from 'react-virtualized';
import cn from 'classnames';
import { Duration } from 'luxon';
import { NoContent, Icon, Button } from 'UI';
import { percentOf } from 'App/utils';

import BarRow from './BarRow';
import stl from './timeTable.module.css';

import autoscrollStl from '../autoscroll.module.css'; //aaa
import JumpButton from '../JumpButton';

type Timed = {
  time: number;
};

type Durationed = {
  duration: number;
};

type CanBeRed = {
  //+isRed: boolean,
  isRed: () => boolean;
};

interface Row extends Timed, Durationed, CanBeRed {
  [key: string]: any;
  key: string;
}

type Line = {
  color: string; // Maybe use typescript?
  hint?: string;
  onClick?: any;
} & Timed;

type Column = {
  label: string;
  width: number;
  dataKey?: string;
  render?: (row: any) => void;
  referenceLines?: Array<Line>;
  style?: React.CSSProperties;
  onClick?: void;
} & RenderOrKey;

// type RenderOrKey = { // Disjoint?
//   render: Row => React.Node
// } | {
//   dataKey: string,
// }
type RenderOrKey =
  | {
      render?: (row: Row) => React.ReactNode;
      key?: string;
    }
  | {
      dataKey: string;
    };

type Props = {
  className?: string;
  rows: Array<Row>;
  children: Array<Column>;
  tableHeight?: number;
  activeIndex?: number;
  renderPopup?: boolean;
  navigation?: boolean;
  referenceLines?: any[];
  additionalHeight?: number;
  hoverable?: boolean;
  onRowClick?: (row: any, index: number) => void;
  onJump?: (time: any) => void;
  sortBy?: string;
  sortAscending?: boolean;
};

type TimeLineInfo = {
  timestart: number;
  timewidth: number;
};

type State = TimeLineInfo & typeof initialState;

//const TABLE_HEIGHT = 195;
let _additionalHeight = 0;
const ROW_HEIGHT = 32;
//const VISIBLE_COUNT = Math.ceil(TABLE_HEIGHT/ROW_HEIGHT);

const TIME_SECTIONS_COUNT = 8;
const ZERO_TIMEWIDTH = 1000;
function formatTime(ms: number) {
  if (ms < 0) return '';
  if (ms < 1000) return Duration.fromMillis(ms).toFormat('0.SSS');
  return Duration.fromMillis(ms).toFormat('mm:ss');
}

function computeTimeLine(
  rows: Array<Row>,
  firstVisibleRowIndex: number,
  visibleCount: number
): TimeLineInfo {
  const visibleRows = rows.slice(
    firstVisibleRowIndex,
    firstVisibleRowIndex + visibleCount + _additionalHeight
  );
  let timestart = visibleRows.length > 0 ? Math.min(...visibleRows.map((r) => r.time)) : 0;
  // TODO: GraphQL requests do not have a duration, so their timeline is borked. Assume a duration of 0.2s for every GraphQL request
  const timeend =
    visibleRows.length > 0 ? Math.max(...visibleRows.map((r) => r.time + (r.duration ?? 200))) : 0;
  let timewidth = timeend - timestart;
  const offset = timewidth / 70;
  if (timestart >= offset) {
    timestart -= offset;
  }
  timewidth *= 1.5; // += offset;
  if (timewidth === 0) {
    timewidth = ZERO_TIMEWIDTH;
  }
  return {
    timestart,
    timewidth,
  };
}

const initialState = {
  firstVisibleRowIndex: 0,
};

export default class TimeTable extends React.PureComponent<Props, State> {
  state = {
    ...computeTimeLine(this.props.rows, initialState.firstVisibleRowIndex, this.visibleCount),
    ...initialState,
  };

  get tableHeight() {
    return this.props.tableHeight || 195;
  }

  get visibleCount() {
    return Math.ceil(this.tableHeight / ROW_HEIGHT);
  }

  scroller = React.createRef<List>();
  autoScroll = true;

  componentDidMount() {
    if (this.scroller.current) {
      this.scroller.current.scrollToRow(this.props.activeIndex);
    }
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    if (
      prevState.firstVisibleRowIndex !== this.state.firstVisibleRowIndex ||
      (this.props.rows.length <= this.visibleCount + _additionalHeight &&
        prevProps.rows.length !== this.props.rows.length)
    ) {
      this.setState({
        ...computeTimeLine(this.props.rows, this.state.firstVisibleRowIndex, this.visibleCount),
      });
    }
    if (
      this.props.activeIndex &&
      this.props.activeIndex >= 0 &&
      prevProps.activeIndex !== this.props.activeIndex &&
      this.scroller.current
    ) {
      this.scroller.current.scrollToRow(this.props.activeIndex);
    }
  }

  onScroll = ({
    scrollTop,
    scrollHeight,
    clientHeight,
  }: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  }): void => {
    const firstVisibleRowIndex = Math.floor(scrollTop / ROW_HEIGHT + 0.33);

    if (this.state.firstVisibleRowIndex !== firstVisibleRowIndex) {
      this.autoScroll = scrollHeight - clientHeight - scrollTop < ROW_HEIGHT / 2;
      this.setState({ firstVisibleRowIndex });
    }
  };

  onJump = (index: any) => {
    if (this.props.onJump) {
      this.props.onJump(this.props.rows[index].time);
    }
  };

  renderRow = ({ index, key, style: rowStyle }: any) => {
    const { activeIndex } = this.props;
    const { children: columns, rows, renderPopup, hoverable, onRowClick } = this.props;
    const { timestart, timewidth } = this.state;
    const row = rows[index];
    return (
      <div
        style={rowStyle}
        key={key}
        className={cn('border-b border-color-gray-light-shade group items-center', stl.row, {
          [stl.hoverable]: hoverable,
          'error color-red': !!row.isRed && row.isRed(),
          'cursor-pointer': typeof onRowClick === 'function',
          [stl.activeRow]: activeIndex === index,
          // [stl.inactiveRow]: !activeIndex || index > activeIndex,
        })}
        onClick={typeof onRowClick === 'function' ? () => onRowClick(row, index) : undefined}
        id="table-row"
      >
        {columns.map(({ dataKey, render, width }) => (
          <div className={stl.cell} style={{ width: `${width}px` }}>
            {render
              ? render(row)
              : row[dataKey || ''] || <i className="color-gray-light">{'empty'}</i>}
          </div>
        ))}
        <div className={cn('relative flex-1 flex', stl.timeBarWrapper)}>
          <BarRow resource={row} timestart={timestart} timewidth={timewidth} popup={renderPopup} />
        </div>
        <JumpButton onClick={() => this.onJump(index)} />
      </div>
    );
  };

  onPrevClick = () => {
    let prevRedIndex = -1;
    for (let i = this.state.firstVisibleRowIndex - 1; i >= 0; i--) {
      if (this.props.rows[i].isRed()) {
        prevRedIndex = i;
        break;
      }
    }
    if (this.scroller.current != null) {
      this.scroller.current.scrollToRow(prevRedIndex);
    }
  };

  onNextClick = () => {
    let prevRedIndex = -1;
    for (let i = this.state.firstVisibleRowIndex + 1; i < this.props.rows.length; i++) {
      if (this.props.rows[i].isRed()) {
        prevRedIndex = i;
        break;
      }
    }
    if (this.scroller.current != null) {
      this.scroller.current.scrollToRow(prevRedIndex);
    }
  };

  onColumnClick = (dataKey: string, onClick: any) => {
    if (typeof onClick === 'function') {
      // this.scroller.current.scrollToRow(0);
      onClick(dataKey);
      this.scroller.current.forceUpdateGrid();
    }
  };

  render() {
    const {
      className,
      rows,
      children: columns,
      navigation = false,
      referenceLines = [],
      additionalHeight = 0,
      activeIndex,
      sortBy = '',
      sortAscending = true,
    } = this.props;
    const { timewidth, timestart } = this.state;

    _additionalHeight = additionalHeight;

    const sectionDuration = Math.round(timewidth / TIME_SECTIONS_COUNT);
    const timeColumns: number[] = [];
    if (timewidth > 0) {
      for (let i = 0; i < TIME_SECTIONS_COUNT; i++) {
        timeColumns.push(timestart + i * sectionDuration);
      }
    }

    const visibleRefLines = referenceLines.filter(
      ({ time }) => time > timestart && time < timestart + timewidth
    );

    const columnsSumWidth = columns.reduce((sum, { width }) => sum + width, 0);

    return (
      <div className={cn(className, 'relative')}>
        {navigation && (
          <div className={cn(autoscrollStl.navButtons, 'flex items-center')}>
            <Button
              variant="text-primary"
              icon="chevron-up"
              tooltip={{
                title: 'Previous Error',
                delay: 0,
              }}
              onClick={this.onPrevClick}
            />
            <Button
              variant="text-primary"
              icon="chevron-down"
              tooltip={{
                title: 'Next Error',
                delay: 0,
              }}
              onClick={this.onNextClick}
            />
          </div>
        )}
        <div className={stl.headers}>
          <div className={stl.infoHeaders}>
            {columns.map(({ label, width, dataKey, onClick = null }) => (
              <div
                className={cn(stl.headerCell, 'flex items-center select-none', {
                  'cursor-pointer': typeof onClick === 'function',
                })}
                style={{ width: `${width}px` }}
                onClick={() => this.onColumnClick(dataKey, onClick)}
              >
                <span>{label}</span>
                {!!sortBy && sortBy === dataKey && <Icon name={ sortAscending ? "caret-down-fill" : "caret-up-fill" } className="ml-1" />}
              </div>
            ))}
          </div>
          <div className={stl.waterfallHeaders}>
            {timeColumns.map((time, i) => (
              <div className={stl.timeCell} key={`tc-${i}`}>
                {formatTime(time)}
              </div>
            ))}
          </div>
        </div>

        <NoContent size="small" show={rows.length === 0}>
          <div className="relative">
            <div className={stl.timePart} style={{ left: `${columnsSumWidth}px` }}>
              {timeColumns.map((_, index) => (
                <div key={`tc-${index}`} className={stl.timeCell} />
              ))}
              {visibleRefLines.map(({ time, color, onClick }) => (
                <div
                  className={cn(stl.refLine, `bg-${color}`)}
                  style={{
                    left: `${percentOf(time - timestart, timewidth)}%`,
                    cursor: typeof onClick === 'function' ? 'click' : 'auto',
                  }}
                  onClick={onClick}
                />
              ))}
            </div>
            <AutoSizer disableHeight>
              {({ width }: { width: number }) => (
                <List
                  ref={this.scroller}
                  className={stl.list}
                  height={this.tableHeight + additionalHeight}
                  width={width}
                  overscanRowCount={20}
                  rowCount={rows.length}
                  rowHeight={ROW_HEIGHT}
                  rowRenderer={this.renderRow}
                  onScroll={this.onScroll}
                  scrollToAlignment="start"
                  forceUpdateProp={timestart | timewidth | (activeIndex || 0)}
                />
              )}
            </AutoSizer>
          </div>
        </NoContent>
      </div>
    );
  }
}
