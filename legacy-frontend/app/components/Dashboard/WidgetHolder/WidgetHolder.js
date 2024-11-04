import React from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'
import stl from './widgetHolder.module.css'
import LazyLoad from 'react-lazyload';

const WidgetHolder = props => {
  const { comparing, Component, period, periodCompare, fullWidth = false } = props;
  const showSync = comparing && period.rangeName === periodCompare.rangeName;

  return (
    <div className={ cn(stl.wrapper, { 'grid grid-cols-2 gap-4 mb-2' : comparing && !fullWidth })}>
      <LazyLoad height={300} offset={320} >
        {<Component showSync={showSync} />}
      </LazyLoad>
      {comparing && (
        <LazyLoad height={300} offset={320}>
          <React.Fragment>            
            <div className={fullWidth ? 'mt-4' : ''}>
              <Component compare showSync={showSync} />
            </div>
          </React.Fragment>
        </LazyLoad>
      )}
    </div>
  )
}

export default connect(state => ({
  comparing: state.getIn([ 'dashboard', 'comparing' ]),
  period: state.getIn([ 'dashboard', 'period' ]),
  periodCompare: state.getIn([ 'dashboard', 'periodCompare' ])
}))(WidgetHolder)
