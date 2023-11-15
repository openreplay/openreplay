import React from 'react';
import { Checkbox, Tooltip } from 'UI';

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
function FeatureSelection(props: Props) {
  const { list } = props;
  const features = [NETWORK, ERRORS, EVENTS, PERFORMANCE, FRUSTRATIONS];
  const disabled = list.length >= 5;

  return (
    <React.Fragment>
      {features.map((feature, index) => {
        const checked = list.includes(feature);
        const _disabled = disabled && !checked;
        return (
          <Tooltip key={index} title="X-RAY supports up to 5 views" disabled={!_disabled} delay={0}>
            <Checkbox
              key={index}
              label={feature}
              checked={checked}
              className="mx-4"
              disabled={_disabled}
              onClick={() => {
                if (checked) {
                  props.updateList(list.filter((item: any) => item !== feature));
                } else {
                  props.updateList([...list, feature]);
                }
              }}
            />
          </Tooltip>
        );
      })}
    </React.Fragment>
  );
}

export default FeatureSelection;
