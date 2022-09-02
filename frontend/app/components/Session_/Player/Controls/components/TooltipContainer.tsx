import React from 'react'
import TimeTooltip from '../TimeTooltip';
import store from 'App/store';
import { Provider } from 'react-redux';

function TooltipContainer({ liveTimeTravel }: { liveTimeTravel: boolean }) {

  return (
    <Provider store={store}>
      <TimeTooltip liveTimeTravel={liveTimeTravel} />
    </Provider>
  )
}

export default React.memo(TooltipContainer);
