import React from 'react'
import { connectPlayer, jump } from 'Player';
import ConsoleContent from './ConsoleContent';

@connectPlayer(state => ({
  logs: state.logList,
  time: state.time,
  livePlay: state.livePlay,
}))
export default class Console extends React.PureComponent {
  render() {
    const { logs, time } = this.props;
    return (
        <ConsoleContent jump={!this.props.livePlay && jump} logs={logs} time={time} />
    );
  }
}
