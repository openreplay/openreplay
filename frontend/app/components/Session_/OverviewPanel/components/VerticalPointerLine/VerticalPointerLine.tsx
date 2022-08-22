import React from 'react';
import { connectPlayer } from 'App/player';
import VerticalLine from '../VerticalLine';

interface Props {
    time: number;
    scale: number;
}
function VerticalPointerLine(props: Props) {
    const { time, scale } = props;
    const left = time * scale;
    return <VerticalLine left={left} className="border-teal" />;
}

export default connectPlayer((state: any) => ({
    time: state.time,
    scale: 100 / state.endTime,
}))(VerticalPointerLine);
