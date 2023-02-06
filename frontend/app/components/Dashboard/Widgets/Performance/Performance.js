import React from 'react';
import { connect } from 'react-redux';
import { Map } from 'immutable';
import cn from 'classnames';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Area, Legend } from 'recharts';
import { Loader, TextEllipsis, Tooltip } from 'UI';
import { TYPES } from 'Types/resource';
import { LAST_24_HOURS, LAST_30_MINUTES, LAST_7_DAYS, LAST_30_DAYS } from 'Types/app/period';
import { fetchPerformanseSearch } from 'Duck/dashboard';
import { widgetHOC } from '../common';

import styles from './performance.module.css';

const BASE_KEY = 'resource';

const pagesColor = '#7FCC33';
const imagesColor = '#40C4FF';
const requestsColor = '#DAB72F';

@widgetHOC('performance', { fullwidth: true })
@connect((state, props) => ({
  performanceChartSpecified: state.getIn([ 'dashboard', 'performanceChart' ]),
  period: state.getIn([ 'dashboard', 'period' ]),
  loading: state.getIn([ 'dashboard', 'performanceSearchRequest', 'loading' ]) ||
    props.loading,
}), {
  fetchPerformanseSearch,
})
export default class Performance extends React.PureComponent {
  state = {
    comparing: false,
    resources: Map(),
    opacity: {},
  }

  onResourceSelect = (resource) => {
    if (!resource || this.state.resources.size > 1) return;
    
    resource.fillColor = this.getFillColor(resource);
    resource.strokeColor = this.getStrokeColor(resource);
    this.setResources(this.state.resources.set(this.state.resources.size, resource));
  }

  onResourceSelect0 = resource => this.onResourceSelect(0, resource)
  onResourceSelect1 = resource => this.onResourceSelect(1, resource)

  getInterval = () => {
    switch (this.props.period.rangeName) {
      case LAST_30_MINUTES:
        return 0;
      case LAST_24_HOURS:
        return 2;
      case LAST_7_DAYS:
        return 3;
      case LAST_30_DAYS:
        return 2;
      default:
        return 0;
    }
  }

  setResources = (resources) => {
    this.setState({
      resources,
    });
    this.props.fetchPerformanseSearch({
      ...this.props.period.toTimestamps(),
      resources: resources.valueSeq().toJS(),
    });
  }

  getFillColor = (resource) => {
    switch (resource.type) {
      case TYPES.IMAGE:
        return 'url(#colorAvgImageLoadTime)';
      case TYPES.PAGE:
        return 'url(#colorAvgPageLoadTime)';
      case TYPES.REQUEST:
        return 'url(#colorAvgRequestLoadTime)';
      default:
        return 'blue';
    }
  }

  getStrokeColor = (resource) => {
    switch (resource.type) {
      case TYPES.IMAGE:
        return imagesColor;
      case TYPES.PAGE:
        return pagesColor;
      case TYPES.REQUEST:
        return requestsColor;
      default:
        return 'blue';
    }
  }

  removeResource = (index) => {
    this.setResources(this.state.resources.remove(index));
  }

  compare = () => this.setState({ comparing: true })

  legendPopup = (component, trigger) => <Tooltip size="mini" content={ component }>{trigger}</Tooltip>

  legendFormatter = (value, entry, index) => {
    const { opacity } = this.state;

    if (value === 'avgPageLoadTime') return (this.legendPopup(opacity.avgPageLoadTime === 0 ? 'Show' : 'Hide', <span className={ opacity.avgPageLoadTime === 0 ? styles.muted : '' }>{'Pages'}</span>));
    if (value === 'avgRequestLoadTime') return (this.legendPopup(opacity.avgRequestLoadTime === 0 ? 'Show' : 'Hide', <span className={ opacity.avgRequestLoadTime === 0 ? styles.muted : '' }>{'Requests'}</span>));
    if (value === 'avgImageLoadTime') return (this.legendPopup(opacity.avgImageLoadTime === 0 ? 'Show' : 'Hide', <span className={ opacity.avgImageLoadTime === 0 ? styles.muted : '' }>{'Images'}</span>));
    // if (value === 'avgImageLoadTime') return (<span className={ opacity.avgImageLoadTime === 0 ? styles.muted : '' }>{'Images'}</span>);
    if (value.includes(BASE_KEY)) {
      const resourceIndex = Number.parseInt(value.substr(BASE_KEY.length));
      return (
        <Tooltip
          title={ this.state.resources.getIn([ resourceIndex, 'value' ]) }
        >
          <TextEllipsis
              maxWidth="200px"
              style={ { verticalAlign: 'middle' } }
              text={ this.state.resources.getIn([ resourceIndex, 'value' ]) }
            />
        </Tooltip>
      );
    }
  }

  handleLegendClick = (legend) => {
    const { dataKey } = legend;
    const { opacity } = this.state;

    if (dataKey === 'resource0') {
      this.removeResource(0);
    } else if (dataKey === 'resource1') {
      this.removeResource(1);
    } else {
      this.setState({
        opacity: { ...opacity, [ dataKey ]: opacity[ dataKey ] === 0 ? 1 : 0 },
      });
    }
  }

  // eslint-disable-next-line complexity
  render() {
    const { comparing, resources, opacity } = this.state;
    const { data, performanceChartSpecified, loading } = this.props;
    const r0Presented = !!resources.get(0);
    const r1Presented = !!resources.get(1);
    const resourcesPresented = r0Presented || r1Presented;
    const defaultData = !resourcesPresented || performanceChartSpecified.length === 0; // TODO: more safe? 
    const interval = this.getInterval();

    return (
      <React.Fragment>
        <div className="flex justify-between">
          <div className={ cn("flex items-center", { "hidden": loading }) }>
          </div>
        </div>
        <Loader loading={ loading } size="small">
          <ResponsiveContainer height={ 300 }>
            <AreaChart data={ defaultData ? data.chart : performanceChartSpecified } margin={ { top: 10, right: 20, left: 20, bottom: 0 } }>
              <defs>
                <linearGradient id="colorAvgPageLoadTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ pagesColor } stopOpacity={ 0.7 } />
                  <stop offset="95%" stopColor={ pagesColor } stopOpacity={ 0.2 } />
                </linearGradient>
                <linearGradient id="colorAvgImageLoadTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ imagesColor } stopOpacity={ 0.7 } />
                  <stop offset="95%" stopColor={ imagesColor } stopOpacity={ 0.2 } />
                </linearGradient>
                <linearGradient id="colorAvgRequestLoadTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ requestsColor } stopOpacity={ 0.7 } />
                  <stop offset="95%" stopColor={ requestsColor } stopOpacity={ 0.2 } />
                </linearGradient>
              </defs>
              <XAxis interval={ interval } dataKey="time" tick={ { fill: '#999999', fontSize: 9 } } />
              <YAxis hide />
              <CartesianGrid strokeDasharray="3 3" vertical={ false } />
              { defaultData && <Area connectNulls type="monotone" dataKey="avgPageLoadTime" stroke={ pagesColor } strokeOpacity={ opacity.avgPageLoadTime } fill="url(#colorAvgPageLoadTime)" fillOpacity={ opacity.avgPageLoadTime } /> }
              { defaultData && <Area connectNulls type="monotone" dataKey="avgImageLoadTime" stroke={ imagesColor } strokeOpacity={ opacity.avgImageLoadTime } fill="url(#colorAvgImageLoadTime)" fillOpacity={ opacity.avgImageLoadTime } /> }
              { defaultData && <Area connectNulls type="monotone" dataKey="avgRequestLoadTime" stroke={ requestsColor } strokeOpacity={ opacity.avgRequestLoadTime } fill="url(#colorAvgRequestLoadTime)" fillOpacity={ opacity.avgRequestLoadTime } /> }
              { !defaultData && r0Presented && <Area type="monotone" dataKey={ `${ BASE_KEY }0` } stroke={ resources.get(0).strokeColor } fill={ resources.get(0).fillColor } fillOpacity={ 0.5 } /> }
              { !defaultData && r1Presented && <Area type="monotone" dataKey={ `${ BASE_KEY }1` } stroke={ resources.get(1).strokeColor } fill={ resources.get(1).fillColor } fillOpacity={ 0.5 } /> }
              <Legend
                verticalAlign="top"
                height={ 36 }
                margin={ { left: 20, right: 20 } }
                formatter={ this.legendFormatter }
                onClick={ this.handleLegendClick }
              />
            </AreaChart>
          </ResponsiveContainer>
        </Loader>
      </React.Fragment>
    );
  }
}
