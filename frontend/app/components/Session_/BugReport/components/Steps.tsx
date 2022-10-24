import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import { Icon } from 'UI';
import EventRow from 'App/components/Session_/OverviewPanel/components/EventRow';
import TimelinePointer from 'App/components/Session_/OverviewPanel/components/TimelinePointer';
import SectionTitle from './SectionTitle';
import { Step as IStep } from '../types';

const STEP_NAMES = { CLICKRAGE: 'Multiple click', CLICK: 'Clicked', LOCATION: 'Visited' };

interface Props {
  xrayProps: {
    currentLocation: Record<string, any>[];
    resourceList: Record<string, any>[];
    exceptionsList: Record<string, any>[];
    eventsList: Record<string, any>[];
    endTime: number;
  };
}

function Steps({ xrayProps }: Props) {
  const { bugReportStore } = useStore();
  const [timePointer, setPointer] = React.useState(0);
  const xrayContainer = React.useRef<HTMLDivElement>();
  const { resourceList, exceptionsList, eventsList, endTime } = xrayProps;

  const resources = {
    NETWORK: resourceList,
    ERRORS: exceptionsList,
    CLICKRAGE: eventsList.filter((item: any) => item.type === 'CLICKRAGE'),
  };

  const pickEventRadius = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    setPointer(e.clientX - xrayContainer.current?.getBoundingClientRect().left);
  };

  return (
    <div>
      <SectionTitle>Steps to reproduce</SectionTitle>

      <div className="mt-2 text-gray-dark">XRAY</div>
      <div
        className="relative"
        onClick={pickEventRadius}
        ref={xrayContainer}
        style={{ background: timePointer > 0 ? 'rgba(57, 78, 255, 0.07)' : undefined }}
      >
        {timePointer > 0 ? (
          <div
            className="absolute h-full bg-white"
            style={{ zIndex: 19, width: 41, left: timePointer - 20, pointerEvents: 'none' }}
          >
            <div
              style={{
                height: '100%',
                width: 1,
                border: '1px dashed rgba(0,0,0, 0.5)',
                left: 20,
                position: 'absolute',
              }}
            />
          </div>
        ) : null}
        {Object.keys(resources).map(feature => (
          <div
            key={feature}
            className="border-b last:border-none z-20 -mx-4"
          >
            <EventRow
              title={feature}
              // @ts-ignore
              list={resources[feature]}
              zIndex={20}
              renderElement={(pointer: any) => (
                <TimelinePointer noClick pointer={pointer} type={feature} />
              )}
              endTime={endTime}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 mb-2 text-gray-dark">STEPS</div>
      <div className="flex flex-col gap-4">
        {bugReportStore.sessionEventSteps.map((step, ind) => (
          <React.Fragment key={step.key}>
            <Step step={step} ind={ind} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function Step({ step, ind }: { step: IStep; ind: number }) {
  return (
    <div className="py-1 px-2 flex items-center gap-2 w-full rounded hover:bg-figmaColors-secondary-outlined-hover-background">
      <div className="rounded-3xl px-4 bg-gray-lightest">{ind + 1}</div>
      <div className="flex items-center gap-2">
        {/* @ts-ignore */}
        <Icon name={step.icon} size={16} color="gray-darkest" />
        {/* @ts-ignore */}
        <div className="font-semibold">{STEP_NAMES[step.type]}</div>
        <div className="text-gray-medium">{step.details}</div>
      </div>
    </div>
  );
}

export default observer(Steps);
