import React from 'react';
import { Progress } from 'semantic-ui-react';

export default ({
  percent, ...props
}) => (
  <Progress
    percent={ percent }
    { ...props }
  />
);
