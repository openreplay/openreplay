import React from 'react';
import VerticalLine from '../VerticalLine';
import { connectPlayer, Controls } from 'App/player';

interface Props {
    children: React.ReactNode;
    endTime: number;
}

const OverviewPanelContainer = React.memo((props: Props) => {
    const { endTime } = props;
    const [mouseX, setMouseX] = React.useState(0);
    const [mouseIn, setMouseIn] = React.useState(false);
    const onClickTrack = (e: any) => {
        const p = e.nativeEvent.offsetX / e.target.offsetWidth;
        const time = Math.max(Math.round(p * endTime), 0);
        if (time) {
            Controls.jump(time);
        }
    };

    // const onMouseMoveCapture = (e: any) => {
    //     if (!mouseIn) {
    //         return;
    //     }
    //     const p = e.nativeEvent.offsetX / e.target.offsetWidth;
    //     setMouseX(p * 100);
    // };

    return (
        <div
            className="overflow-x-auto overflow-y-hidden bg-gray-lightest"
            onClick={onClickTrack}
            // onMouseMoveCapture={onMouseMoveCapture}
            // onMouseOver={() => setMouseIn(true)}
            // onMouseOut={() => setMouseIn(false)}
        >
            {mouseIn && <VerticalLine left={mouseX} className="border-gray-medium" />}
            <div className="">{props.children}</div>
        </div>
    );
});

export default OverviewPanelContainer;

// export default connectPlayer((state: any) => ({
//     endTime: state.endTime,
// }))(OverviewPanelContainer);
