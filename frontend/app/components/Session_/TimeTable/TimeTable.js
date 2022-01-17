// @flow
import { List, AutoSizer } from "react-virtualized";

import cn from 'classnames';
import { NoContent, IconButton } from 'UI';
import { percentOf } from 'App/utils'; 
import { formatMs } from 'App/date';

import BarRow from './BarRow';
import stl from './timeTable.css';

import autoscrollStl from '../autoscroll.css'; //aaa


type Timed = {
  +time: number,
}

type Durationed = {
  +duration: number,
}

type CanBeRed = {
  //+isRed: boolean,
  isRed: () => boolean,
}

type Row = Timed & Durationed & CanBeRed

type Line = {
  color: string,  // Maybe use typescript?
  hint?: string,
  onClick?: Line => any,
} & Timed

type Column = {
  label: string,
  width: number,
  referenceLines: ?Array<Line>,
  style?: Object,
} & RenderOrKey

type RenderOrKey = { // Disjoint?
  render: Row => React.Node 
} | {
  dataKey: string,
}


type Props = {
  className?: string,
  rows: Array<Row>,

  children: Array<Column>
}

type TimeLineInfo = {
  timestart: number,
  timewidth: number,
}

type State = TimeLineInfo & typeof initialState;

//const TABLE_HEIGHT = 195;
let _additionalHeight = 0;
const ROW_HEIGHT = 32;
//const VISIBLE_COUNT = Math.ceil(TABLE_HEIGHT/ROW_HEIGHT);

const TIME_SECTIONS_COUNT = 8;
const ZERO_TIMEWIDTH = 1000;
function formatTime(ms) {
  if(ms < 0) return "";
  return formatMs(ms);
}

function computeTimeLine(rows: Array<Row>, firstVisibleRowIndex: number, visibleCount): TimeLineInfo {
  const visibleRows = rows.slice(firstVisibleRowIndex, firstVisibleRowIndex + visibleCount + _additionalHeight);
  let timestart = visibleRows.length > 0 
    ? Math.min(...visibleRows.map(r => r.time))
    : 0;
  const timeend = visibleRows.length > 0 
    ? Math.max(...visibleRows.map(r => r.time + r.duration))
    : 0;
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
}

export default class TimeTable extends React.PureComponent<Props, State> {
  state = {
    ...computeTimeLine(this.props.rows, initialState.firstVisibleRowIndex, this.visibleCount),
    ...initialState,
  }

  get tableHeight() {
    return  this.props.tableHeight || 195;
  }

  get visibleCount() {
    return Math.ceil(this.tableHeight/ROW_HEIGHT);
  }

  scroller = React.createRef();
  autoScroll = true;

  // componentDidMount() {
  //   if (this.scroller.current != null) {
  //     this.scroller.current.scrollToRow(this.props.rows.length - 1);      
  //   }   
  // }

  componentDidUpdate(prevProps, prevState) {
    // if (prevProps.rows.length !== this.props.rows.length && 
    //     this.autoScroll && 
    //     this.scroller.current != null) {
    //   this.scroller.current.scrollToRow(this.props.rows.length);
    // }
    if (prevState.firstVisibleRowIndex !== this.state.firstVisibleRowIndex ||
        (this.props.rows.length <= (this.visibleCount + _additionalHeight) && prevProps.rows.length !== this.props.rows.length)) {
      this.setState({
        ...computeTimeLine(this.props.rows, this.state.firstVisibleRowIndex, this.visibleCount),
      });
    }    
    if (this.props.activeIndex >= 0 && prevProps.activeIndex !== this.props.activeIndex && this.scroller.current != null) {
      this.scroller.current.scrollToRow(this.props.activeIndex);
    }
  }

  onScroll = ({ scrollTop, scrollHeight, clientHeight }: 
      { scrollTop: number, scrollHeight: number, clientHeight: number }):void => {
    const firstVisibleRowIndex = Math.floor(scrollTop / ROW_HEIGHT + 0.33);

    if (this.state.firstVisibleRowIndex !== firstVisibleRowIndex) {
      this.autoScroll = (scrollHeight - clientHeight - scrollTop) < ROW_HEIGHT / 2;
      this.setState({ firstVisibleRowIndex });
    }
  }

  renderRow = ({ index, key, style: rowStyle }) => {
    const { activeIndex } = this.props;
    const { 
      children: columns,
      rows,
      renderPopup,
      hoverable,
      onRowClick,
    } = this.props;
    const {
      timestart,
      timewidth,
    } = this.state;
    const row = rows[ index ];    
    return (
      <div
        style={ rowStyle }
        key={ key } 
        className={ cn('border-b border-color-gray-light-shade', stl.row, { [ stl.hoverable ]: hoverable, "error color-red": !!row.isRed && row.isRed(), 'cursor-pointer' : typeof onRowClick === "function", [stl.activeRow] : activeIndex === index }) }
        onClick={ typeof onRowClick === "function" ? () => onRowClick(row, index) : null }
        id="table-row"
      >
        { columns.map(({ dataKey, render, width }) => (
          <div className={ stl.cell } style={{ width: `${width}px`}}> 
            { render ? render(row) : (row[ dataKey ] || <i className="color-gray-light">{"empty"}</i>) }
          </div>
        ))}
        <div className={ cn("relative flex-1 flex", stl.timeBarWrapper)}>
          <BarRow 
            resource={ row } 
            timestart={ timestart } 
            timewidth={ timewidth } 
            popup={ renderPopup } 
          />
        </div>
      </div>
    );
  }

  onPrevClick = () => {
    let prevRedIndex = -1;
    for (let i = this.state.firstVisibleRowIndex-1; i >= 0; i--) {
      if (this.props.rows[ i ].isRed()) {
        prevRedIndex = i;
        break;
      }
    }
    if (this.scroller.current != null) {
      this.scroller.current.scrollToRow(prevRedIndex);
    }
  }

  onNextClick = () => {
    let prevRedIndex = -1;
    for (let i = this.state.firstVisibleRowIndex+1; i < this.props.rows.length; i++) {
      if (this.props.rows[ i ].isRed()) {
        prevRedIndex = i;
        break;
      }
    }
    if (this.scroller.current != null) {
      this.scroller.current.scrollToRow(prevRedIndex);
    }
  }

  render() {
    const { 
      className,
      rows,
      children: columns, 
      navigation=false,
      referenceLines = [],
      additionalHeight = 0,
      activeIndex,
    } = this.props;
    const { 
      timewidth,
      timestart,
    } = this.state;

    _additionalHeight = additionalHeight;

    const sectionDuration = Math.round(timewidth / TIME_SECTIONS_COUNT);
    const timeColumns = [];
    if (timewidth > 0) {
      for (let i = 0; i < TIME_SECTIONS_COUNT; i++) {
        timeColumns.push(timestart + i * sectionDuration);
      }
    }

    const visibleRefLines = referenceLines.filter(({ time }) => time > timestart && time < timestart + timewidth);

    const columnsSumWidth = columns.reduce((sum, { width }) => sum + width, 0);

    return (
      <div className={ cn(className, "relative") }>
        { navigation && 
          <div className={ cn(autoscrollStl.navButtons, "flex items-center") } >
            <IconButton 
              size="small" 
              icon="chevron-up" 
              onClick={this.onPrevClick}
            />
            <IconButton 
              size="small" 
              icon="chevron-down"
              onClick={this.onNextClick}
            />
          </div>
        }
        <div className={ stl.headers }>
          <div className={ stl.infoHeaders }>
            { columns.map(({ label, width }) => (
              <div 
                className={ stl.headerCell }
                style={{ width: `${width}px` 
              }}>
                { label }
              </div>
            )) }
          </div>
          <div className={ stl.waterfallHeaders } >
            { timeColumns.map((time, i) => (
                <div 
                  className={ stl.timeCell }
                  key={ `tc-${ i }` }
                >
                  { formatTime(time) }
                </div>
              ))
            }
          </div>
        </div>

        <NoContent
          size="small"
          show={ rows.length === 0 }
        >
          <div className="relative">
            <div className={ stl.timePart } style={{ left: `${ columnsSumWidth }px` }}>
              { timeColumns.map((_, index) => (
                  <div 
                    key={ `tc-${ index }` } 
                    className={ stl.timeCell } 
                  />
                ))
              }
              { visibleRefLines.map(({ time, color, onClick }) => (
                <div 
                  className={cn(stl.refLine, `bg-${color}`)} 
                  style={{ 
                    left: `${ percentOf(time - timestart, timewidth) }%`,
                    cursor: typeof onClick === "function" ? "click" : "auto",
                  }}
                  onClick={ onClick }
                />
              ))}
            </div>
            <AutoSizer disableHeight>
              {({ width }) => (
                <List
                  ref={ this.scroller }
                  className={ stl.list }
                  height={this.tableHeight + additionalHeight}
                  width={width}
                  overscanRowCount={20}
                  rowCount={rows.length}
                  rowHeight={ROW_HEIGHT}
                  rowRenderer={this.renderRow}
                  onScroll={ this.onScroll }
                  scrollToAlignment="start"
                  forceUpdateProp={ timestart | timewidth | activeIndex }
                />
              )}
            </AutoSizer>
          </div>
        </NoContent>
      </div>
    );
  }
}

