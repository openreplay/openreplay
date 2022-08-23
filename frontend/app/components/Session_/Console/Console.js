import React from 'react'
import { connectPlayer, jump } from 'Player';
import ConsoleContent from './ConsoleContent';

@connectPlayer(state => ({
  logs: state.logList,
  // time: state.time,
  livePlay: state.livePlay,
  listNow: state.logListNow,
}))
export default class Console extends React.PureComponent {
  render() {
    const { logs, time, listNow } = this.props;
    return (
      <ConsoleContent jump={!this.props.livePlay && jump} logs={logs} lastIndex={listNow.length - 1} logsNow={listNow} />
    );
  }
}
