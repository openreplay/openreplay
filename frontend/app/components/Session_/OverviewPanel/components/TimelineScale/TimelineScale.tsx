import React from 'react';
import { connectPlayer } from 'App/player';
import { millisToMinutesAndSeconds } from 'App/utils';

interface Props {
    endTime: number;
}
function TimelineScale(props: Props) {
    const { endTime } = props;
    const scaleRef = React.useRef<HTMLDivElement>(null);
    const gap = 60;

    const drawScale = (container: any) => {
        const width = container.offsetWidth;
        const part = Math.round(width / gap);
        container.replaceChildren();
        for (var i = 0; i < part; i++) {
            const txt = millisToMinutesAndSeconds(i * (endTime / part));
            const el = document.createElement('div');
            // el.style.height = '10px';
            // el.style.width = '1px';
            // el.style.backgroundColor = '#ccc';
            el.style.position = 'absolute';
            el.style.left = `${i * gap}px`;
            el.style.paddingTop = '1px';
            el.style.opacity = '0.8';
            el.innerHTML = txt + '';
            el.style.fontSize = '12px';
            el.style.color = 'white';

            container.appendChild(el);
        }
    };

    React.useEffect(() => {
        if (!scaleRef.current) {
            return;
        }

        drawScale(scaleRef.current);

        // const resize = () => drawScale(scaleRef.current);

        // window.addEventListener('resize', resize);
        // return () => {
        //     window.removeEventListener('resize', resize);
        // };
    }, [scaleRef]);
    return (
        <div className="h-6 bg-gray-darkest w-full" ref={scaleRef}>
            {/* <div ref={scaleRef} className="w-full h-10 bg-gray-300 relative"></div> */}
        </div>
    );
}

export default TimelineScale;

// export default connectPlayer((state: any) => ({
//     endTime: state.endTime,
// }))(TimelineScale);
