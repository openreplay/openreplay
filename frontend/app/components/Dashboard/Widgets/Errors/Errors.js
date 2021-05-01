import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Area } from 'recharts';
import { Loader, NoContent } from 'UI';
import { CountBadge, domain, widgetHOC } from '../common';
import styles from './errors.css';

@widgetHOC('errors')
export default class Errors extends React.PureComponent {
  render() {
    const { data, loading } = this.props;

    const isMoreThanKSessions = data.impactedSessions > 1000;
    const impactedSessionsView = isMoreThanKSessions ? Math.trunc(data.impactedSessions / 1000) : data.impactedSessions;
    return (
      <div className="flex justify-between items-center flex-1 flex-shrink-0">
        <Loader loading={ loading } size="small">
          <NoContent 
            title="No exceptions."
            size="small"
            show={ data.count === 0 && data.progress === 0 }
          >
            <CountBadge
              title={ <div className={ styles.label }>{ 'Events' }</div> }
              count={ data.count }
              change={ data.progress }
              oppositeColors
            />
            <CountBadge
              title={ <div className={ styles.label }>{ 'Sessions' }</div> }
              count={ impactedSessionsView }
              change={ data.impactedSessionsProgress }
              unit={ isMoreThanKSessions ? 'k' : '' }
              oppositeColors
            />
            <ResponsiveContainer height={ 140 } width="60%">
              <AreaChart data={ data.chart } margin={ { top: 10, right: 20, left: 20, bottom: 0 } }>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A8E0DA" stopOpacity={ 0.9 } />
                    <stop offset="95%" stopColor="#A8E0DA" stopOpacity={ 0.2 } />
                  </linearGradient>
                </defs>
                <XAxis interval={ 0 } dataKey="time" tick={ { fill: '#999999', fontSize: 9 } } />
                <YAxis interval={ 0 } hide domain={ domain }/>
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <Area type="monotone" dataKey="count" stroke="#3EAAAF" fill="url(#colorCount)" fillOpacity={ 1 } strokeWidth={ 1 } strokeOpacity={ 0.8 } />
              </AreaChart>
            </ResponsiveContainer>
          </NoContent>
        </Loader>
      </div>
    );
  }
}
