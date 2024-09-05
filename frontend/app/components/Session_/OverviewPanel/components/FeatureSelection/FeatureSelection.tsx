import React from 'react';
import { Popover, Checkbox } from 'antd';
import { Icon } from 'UI'

const NETWORK = 'NETWORK';
const ERRORS = 'ERRORS';
const EVENTS = 'EVENTS';
const FRUSTRATIONS = 'FRUSTRATIONS';
const PERFORMANCE = 'PERFORMANCE';

export const HELP_MESSAGE: any = {
  NETWORK: 'Network requests with issues in this session',
  EVENTS: 'Visualizes the events that takes place in the DOM',
  ERRORS: 'Visualizes native errors like Type, URI, Syntax etc.',
  PERFORMANCE: 'Summary of this session’s memory, and CPU consumption on the timeline',
  FRUSTRATIONS: 'Indicates user frustrations in the session',
};

interface Props {
  list: any[];
  updateList: any;
}

const sortPriority = {
  [PERFORMANCE]: 1,
  [FRUSTRATIONS]: 2,
  [ERRORS]: 3,
  [NETWORK]: 4,
  [EVENTS]: 5,
};
const featLabels = {
  [PERFORMANCE]: 'Performance Overview',
  [FRUSTRATIONS]: 'User Frustrations',
  [ERRORS]: 'Session Errors',
  [NETWORK]: 'Network Events',
  [EVENTS]: 'Custom Events',
}

function FeatureSelection(props: Props) {
  const features = [NETWORK, ERRORS, EVENTS, PERFORMANCE, FRUSTRATIONS];

  const toggleFeatureInList = (feat: string) => {
    if (props.list.includes(feat)) {
      props.updateList(props.list.filter((f) => f !== feat));
    } else {
      // @ts-ignore
      props.updateList([...props.list, feat].sort((a, b) => sortPriority[a] - sortPriority[b]));
    }
  };
  const toggleAllFeatures = () => {
    if (props.list.length === features.length) {
      props.updateList([]);
    } else {
      props.updateList(features);
    }
  }
  return (
    <React.Fragment>
      <Popover
        trigger="click"
        content={
          <div>
            <div
              className={'flex items-center gap-2 cursor-pointer'}
              onClick={() => toggleAllFeatures()}
            >
              <Checkbox checked={props.list.length === features.length}  />
              <div>All Features</div>
            </div>
            {features.map((feat) => (
              <div
                key={feat}
                className={'flex items-center gap-2 cursor-pointer'}
                onClick={() => toggleFeatureInList(feat)}
              >
                <Checkbox checked={props.list.includes(feat)} />
                {/* @ts-ignore */}
                <div>{featLabels[feat]}</div>
              </div>
            ))}
          </div>
        }
      >
        <div className={'font-semibold flex items-center gap-2 text-main cursor-pointer'}>
          <Icon size={16} name={'funnel'} color={'main'} />
          <div>X-Ray Events</div>
        </div>
      </Popover>
    </React.Fragment>
  );
}

export default FeatureSelection;
