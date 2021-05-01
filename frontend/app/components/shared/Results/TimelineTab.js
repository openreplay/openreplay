import { useState } from 'react';
import { Popup, Icon, Label } from 'UI';
import typeToIcon from './typeToIcon';
import cn from 'classnames';
import styles from './timelineTab.css';
import ImageViewer from '../ImageViewer/ImageViewer';

const formatExecutionTime = ({ milliseconds }) => (milliseconds >= 1000
  ? `${ Math.round(milliseconds / 1000) } s`
  : `${ milliseconds } ms`);

const formatStartTime = (time, firstStepTime) =>
  time.diff(firstStepTime).toFormat('mm:ss');

const renderStep = (step, makeGotoLogHandler, startedAt, onThumbClick, index) => (
  <div className={ cn(styles.step, 'flex items-center', { 'failed' : step.status === 'failed' }) }>
    <div className={ cn(styles.iconWrapper) }>
      <Icon name={ typeToIcon(step.label) } size="20" color="gray-dark" />
    </div>
    <div className={ styles.description }>
      <div className="text-sm color-gray-medium">
        @ { formatStartTime(step.startedAt, startedAt) }
      </div>

      <div className={ styles.line }>        
        <div className="text-lg">{ step.title }</div>
      </div>

      { step.info &&
        <div
          className={ styles.info }
        >
          {step.info}
        </div>
      }
      { step.input && (
        <Label data-red={ step.input === 'failed' }><div className="uppercase w-16 justify-center">{step.input}</div></Label>
      )}
    </div>
    <div className={ cn('ml-auto text-right flex items-center') }>
      <img
        src={step.screenshotUrl}
        className="w-20 h-12 border cursor-pointer"
        onClick={() => onThumbClick(index)}
      />
      <div className="mx-10"></div>
      <div className="w-16">{ formatExecutionTime(step.duration) }</div>
    </div>
  </div>
);

const TimelineTab = ({
  steps, startedAt, makeGotoLogHandler, className,
}) => {
  const [stepIndex, setStepIndex] = useState(null)

  const onThumbClick = (index) => {    
    setStepIndex(index);
  }

  return (
    <>
      { stepIndex != null && (
        <ImageViewer
          source={steps.map(i => i.screenshotUrl).toJS()}
          activeIndex={stepIndex}
          onClose={() => setStepIndex(null)}
        />
      )}
      <div className={ className }>    
        <div className="flex justify-between py-4 border-b">
        <div className="font-medium">User Events</div>
          <div className="font-medium">Duration</div>
        </div>
        <div className="relative">      
          { steps.map((step, index) => (
            <div className={ styles.stepWrapper } key={ step.order }>
              <div className={styles.verticleLine }/>
              { renderStep(step, makeGotoLogHandler, startedAt, onThumbClick, index) }
              {
                step.steps && step.steps.size > 0 &&
                <div className={ styles.subSteps }>
                  {
                    step.steps.map((subStep, j) => (
                      <div key={ subStep.order }>
                        { renderStep(subStep, j, makeGotoLogHandler, startedAt, null, index) }
                      </div>
                    ))
                  }
                </div>
              }
              <div className={styles.bottomBorder} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default TimelineTab;