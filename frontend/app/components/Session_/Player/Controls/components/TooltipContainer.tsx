import React from 'react'
import TimeTooltip from '../TimeTooltip';
import store from 'App/store';
import { Provider } from 'react-redux';

function TooltipContainer({ live }: { live: boolean }) {

  return (
    <Provider store={store}>
      <TimeTooltip liveTimeTravel={live} />
    </Provider>
  )
}

export default React.memo(TooltipContainer);
