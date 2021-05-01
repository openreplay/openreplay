import { widgetHOC } from '../common';
import { TrendChart } from '../TrendChart';
import { OVERVIEW_WIDGET_MAP } from 'Types/dashboard';
import { camelCased } from 'App/utils';
import { connect } from 'react-redux';
import { updateAppearance } from 'Duck/user';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';
import cn from 'classnames';
import stl from './overviewWidgets.css';

const customParams = rangeName => {
  const params = { density: 16 }

  if (rangeName === LAST_24_HOURS) params.density = 16
  if (rangeName === LAST_30_MINUTES) params.density = 16
  if (rangeName === YESTERDAY) params.density = 16
  if (rangeName === LAST_7_DAYS) params.density = 16
  
  return params
}

@connect(state => ({
  dashboardAppearance: state.getIn([ 'user', 'account', 'appearance', 'dashboard' ]),
  appearance: state.getIn([ 'user', 'account', 'appearance' ]),
  comparing: state.getIn([ 'dashboard', 'comparing' ]),
}), { updateAppearance })
@widgetHOC('overview', { customParams }, false)
export default class OverviewWidgets extends React.PureComponent {
  handleRemove = widgetKey => {
    const { appearance } = this.props;
    this.props.updateAppearance(appearance.setIn([ 'dashboard', widgetKey ], false));
  }
  render() {
    const { data, dataCompare, loading, loadingCompare, dashboardAppearance, comparing } = this.props;    
    
    const widgets = {}
    const widgetsCompare = {}
    data
      .filter(item => dashboardAppearance[camelCased(item.key)]) // TODO should come filtered from API
      .forEach(item => {
        widgets[item.key] = item;
      })

    if (comparing) {
      dataCompare
      .filter(item => dashboardAppearance[camelCased(item.key)]) // TODO should come filtered from API
      .forEach(item => {
        widgetsCompare[item.key] = item;
      })
    }

    return (
      <React.Fragment>
        {Object.values(OVERVIEW_WIDGET_MAP).map(item => {          
          const widget = widgets[item.key] || {};
          item.data = widget ?  widget.chart : {};

          const widgetCompare = widgetsCompare[item.key] || {};
          if (comparing) {
            item.dataCompare = widgetCompare ?  widgetCompare.chart : {};
          }
          if (!dashboardAppearance[item.key]) return;

          return (
            <div key={item.key} className={cn(stl.wrapper)}>
              <TrendChart
                syncId={item.key}
                loading={loading}
                data={item.data}
                key={item.key}
                tooltipLael={item.tooltipLabel || 'Avg'}
                title={item.name}
                avg={Math.round(widget.value)}
                subtext={item.subtext}
                progress={Math.round(widget.progress)}
                unit={item.unit}
                handleRemove={() => this.handleRemove(item.key)}
                comparing={comparing}
              />
              {comparing && (
                <React.Fragment>
                  <div className="mb-2" />
                  <TrendChart
                    syncId={item.key}
                    compare
                    loading={loadingCompare}
                    data={item.dataCompare}
                    key={'_' + item.key}
                    title={item.name}
                    avg={Math.round(widgetCompare.value)}
                    subtext={item.subtext}
                    progress={Math.round(widgetCompare.progress)}
                    unit={item.unit}
                    handleRemove={() => this.handleRemove(item.key)}
                    comparing={comparing}
                  />
                </React.Fragment>
              )}
            </div>
          )
        })}        
      </React.Fragment>
    );
  }
}
