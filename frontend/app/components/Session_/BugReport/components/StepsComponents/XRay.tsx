import React from 'react';
import { Duration } from 'luxon';
import { observer } from 'mobx-react-lite';
import { toJS } from 'mobx'
import { Icon } from 'UI';
import { useStore } from 'App/mstore';
import { INDEXES } from 'App/constants/zindex';
import TimelinePointer from 'App/components/Session_/OverviewPanel/components/TimelinePointer';
import EventRow from 'App/components/Session_/OverviewPanel/components/EventRow';
import { selectEventSteps } from '../../utils';

interface IXRay {
  xrayProps: {
    currentLocation: Record<string, any>[];
    resourceList: Record<string, any>[];
    exceptionsList: Record<string, any>[];
    eventsList: Record<string, any>[];
    endTime: number;
  };
  timePointer: number;
  stepPickRadius: number;
  clearEventSelection: () => void;
  setPointer: (time: number) => void;
}

function XRay({ xrayProps, timePointer, stepPickRadius, clearEventSelection, setPointer }: IXRay) {
  const [selectedTime, setTime] = React.useState(0);
  const xrayContainer = React.useRef<HTMLDivElement>();
  const { bugReportStore } = useStore();

  const { resourceList, exceptionsList, eventsList, endTime } = xrayProps;

  const resources = {
    NETWORK: resourceList,
    ERRORS: exceptionsList,
    CLICKRAGE: eventsList.filter((item: any) => item.type === 'CLICKRAGE'),
  };

  console.log(JSON.stringify(resources.CLICKRAGE, undefined, 2))

  const pickEventRadius = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();

    const pos = e.clientX - xrayContainer.current?.getBoundingClientRect().left;
    const percent = pos / xrayContainer.current?.getBoundingClientRect().width;
    const targetTime = percent * endTime;
    const selectedSteps = selectEventSteps(
      bugReportStore.sessionEventSteps,
      targetTime,
      stepPickRadius
    );

    setTime(targetTime);
    setPointer(e.clientX - xrayContainer.current?.getBoundingClientRect().left);
    bugReportStore.setSteps(selectedSteps);
  };

  React.useEffect(() => {
    if (timePointer > 0 && selectedTime > 0 && bugReportStore.chosenEventSteps) {
      const selectedSteps = selectEventSteps(
        bugReportStore.sessionEventSteps,
        selectedTime,
        stepPickRadius
      );

      bugReportStore.setSteps(selectedSteps);
    }
  }, [stepPickRadius])

  const shouldShowPointerReset = timePointer > 0;

  return (
    <>
      <div className="flex items-center justify-between my-2">
        <div className=" text-gray-dark">
          XRAY
          {timePointer > 0 ? (
            <span className="text-disabled-text ml-2">
              {Duration.fromMillis(selectedTime).toFormat('hh:mm:ss')}
            </span>
          ) : null}
        </div>
        {!shouldShowPointerReset ? (
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-light-blue-bg" id="pdf-ignore">
            <Icon name="info-circle" size={16} />
            <div>
              Click anywhere on <span className="font-semibold">X-RAY</span> to drilldown and add
              steps
            </div>
          </div>
        ) : (
          <div className="text-blue py-1 cursor-pointer" onClick={clearEventSelection} id="pdf-ignore">
            Clear Selection
          </div>
        )}
      </div>
      <div
        className="relative cursor-pointer"
        onClick={pickEventRadius}
        ref={xrayContainer}
      >
          <div id="pdf-ignore" style={{ pointerEvents: 'none', background: timePointer > 0 ? 'rgb(57, 78, 255)' : undefined, opacity: '0.07', position: 'absolute', top:0, left:0, width:'100%', height: '100%' }} />
        {timePointer > 0 ? (
          <div
            className="absolute h-full bg-white"
            // id="pdf-ignore"
            style={{
              zIndex: INDEXES.BUG_REPORT_PICKER,
              width: 41,
              left: timePointer - 20,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                height: '100%',
                width: 0,
                borderLeft: '2px dashed rgba(0,0,0, 0.5)',
                left: 20,
                position: 'absolute',
                zIndex: INDEXES.BUG_REPORT + 1,
              }}
            />
          </div>
        ) : null}
        {Object.keys(resources).map((feature) => (
          <div key={feature} className="border-b-2 last:border-none relative z-20">
            <EventRow
              title={feature}
              // @ts-ignore
              list={resources[feature]}
              zIndex={INDEXES.BUG_REPORT}
              noMargin
              renderElement={(pointer: any) => (
                <TimelinePointer noClick pointer={pointer} type={feature} />
              )}
              endTime={endTime}
            />
          </div>
        ))}
      </div>
    </>
  );
}

export default observer(XRay);
