import React from 'react'
import TimeTooltip from './TimeTooltip';
import CreateNote from './CreateNote';
import store from 'App/store';
import { Provider } from 'react-redux';

function TooltipContainer() {

  return (
    <Provider store={store}>
      <>
        <TimeTooltip />
        <CreateNote />
      </>
    </Provider>
  )
}

export default React.memo(TooltipContainer);
