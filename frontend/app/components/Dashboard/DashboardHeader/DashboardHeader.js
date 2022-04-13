import React from 'react'
import { LAST_24_HOURS, LAST_30_MINUTES, LAST_7_DAYS, LAST_30_DAYS, CUSTOM_RANGE } from 'Types/app/period';
import { ALL, DESKTOP, MOBILE } from 'Types/app/platform';
import { connect } from 'react-redux';
import { setPeriod, setPlatform } from 'Duck/dashboard';
import cn from 'classnames';
import styles from './DashboardHeader.css';
import Filters from '../Filters/Filters';

export const PERIOD_OPTIONS = [
  { text: 'Past 30 Min', value: LAST_30_MINUTES },
  { text: 'Past 24 Hours', value: LAST_24_HOURS },
  { text: 'Past 7 Days', value: LAST_7_DAYS },
  { text: 'Past 30 Days', value: LAST_30_DAYS },
  { text: 'Choose Date', value: CUSTOM_RANGE },
];

const PLATFORM_OPTIONS = [
  { text: 'All Platforms', value: ALL },
  { text: 'Desktop', value: DESKTOP },
  { text: 'Mobile', value: MOBILE }
];

const DashboardHeader = props => {
  return (
    <div className={ cn(styles.header, 'w-full') }>
      <Filters />
      
      <div className="flex items-center hidden">        
      </div>
    </div>
  )
}

export default connect(state => ({
  period: state.getIn([ 'dashboard', 'period' ]),
  platform: state.getIn([ 'dashboard', 'platform' ]),
  currentProjectId: state.getIn([ 'site', 'siteId' ]),
  sites: state.getIn([ 'site', 'list' ]),
}), { setPeriod, setPlatform })(DashboardHeader)
