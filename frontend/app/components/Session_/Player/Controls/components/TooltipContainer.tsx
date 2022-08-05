import React from 'react'
import { Tooltip } from 'react-tippy';
import TimeTooltip from '../TimeTooltip';
import store from 'App/store';
import { Provider } from 'react-redux';

function TooltipContainer() {

  return (
    // @ts-ignore
    <Tooltip
        useContext
        followCursor
        delay={100}
        html={
          <Provider store={store}>
            <TimeTooltip />
          </Provider>
        }
        interactive
        position='top'
        arrow
        className='w-full h-full absolute top-0'
      >
        <div className='w-full h-full' />
      </Tooltip>
  )
}

export default React.memo(TooltipContainer);
