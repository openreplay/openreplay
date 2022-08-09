import React from 'react';
import { connectPlayer } from 'App/player';

interface Props {
    time: number;
    scale: number;
}
function VerticalPointerLine(props: Props) {
    const { time, scale } = props;
    const left = time * scale;
    return <div className="absolute border-r border-teal border-dashed z-10" style={{ left: `${left}%`, height: '250px', width: '1px' }} />;
}

export default connectPlayer((state: any) => ({
    time: state.time,
    scale: 100 / state.endTime,
}))(VerticalPointerLine);
