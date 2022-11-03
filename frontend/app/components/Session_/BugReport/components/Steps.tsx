import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { RADIUS } from '../utils';
import SectionTitle from './SectionTitle';
import XRay from './StepsComponents/XRay';
import StepRenderer from './StepsComponents/StepRenderer';
import StepRadius from './StepsComponents/StepRadius'
import SubModal from './StepsComponents/SubModal'

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
  const [stepPickRadius, setRadius] = React.useState(RADIUS);
  const [timePointer, setPointer] = React.useState(0);

  const shouldShowEventReset = bugReportStore.chosenEventSteps.length > 0;

  const handleStepsSelection = () => {
    if (shouldShowEventReset) {
      return clearEventSelection();
    }
    if (timePointer > 0) {
      // temp ?
      return bugReportStore.setSteps(bugReportStore.sessionEventSteps);
    } else {
      bugReportStore.setSteps(bugReportStore.sessionEventSteps);
    }
  };

  const clearEventSelection = () => {
    setPointer(0);
    bugReportStore.resetSteps();
  };

  return (
    <div>
      <SectionTitle>Steps to reproduce</SectionTitle>

      <XRay
        xrayProps={xrayProps}
        timePointer={timePointer}
        clearEventSelection={clearEventSelection}
        setPointer={setPointer}
        stepPickRadius={stepPickRadius}
      />

      <div className="flex items-center justify-between">
        <div className="mt-4 mb-2 text-gray-dark flex items-center gap-4">
          STEPS

          <div id="pdf-ignore">{timePointer > 0 ? <StepRadius pickRadius={stepPickRadius} setRadius={setRadius} /> : null}</div>
        </div>
        <div className="text-blue cursor-pointer" id="pdf-ignore" onClick={handleStepsSelection}>
          {!shouldShowEventReset ? (
            <span>Add {timePointer > 0 ? '' : 'All'} Steps</span>
          ) : (
            <span>Reset</span>
          )}
        </div>
      </div>
      <StepRenderer
        isDefault={bugReportStore.chosenEventSteps.length === 0}
        steps={
          bugReportStore.chosenEventSteps.length === 0
            ? bugReportStore.sessionEventSteps
            : bugReportStore.chosenEventSteps
        }
      />
      {bugReportStore.isSubStepModalOpen ? (
        <SubModal type={bugReportStore.subModalType} toggleModal={bugReportStore.toggleSubStepModal} xrayProps={xrayProps}/>
      ) : null}
    </div>
  );
}

export default observer(Steps);
