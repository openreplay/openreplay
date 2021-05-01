import { connect } from 'react-redux';
import { Loader } from 'UI';
import { msToSec } from 'App/date';
import { CountBadge, Divider, widgetHOC } from './common';

@widgetHOC('topMetrics')
export default class TopMetrics extends React.PureComponent {
  render() {
    const { data, loading } = this.props;
    return (
      <div className="flex-1 no-shrink">
        <Loader loading={ loading } size="small">
          <div className="flex space-around align-centered">
            <CountBadge
              title="Avg. Response Time"
              unit="s"
              icon="window"
              count={ msToSec(data.avgResponseTime) }
              change={ data.avgPageLoadProgress }
              oppositeColors
            />
            <Divider />
            <CountBadge
              title="Request Count"
              unit="ms"
              icon="eye"
              count={ data.requestsCount }
              change={ data.avgImgLoadProgress }
              oppositeColors
            />
            {/* <Divider /> */}
          </div>
          <div className="flex space-around align-centered">
            <CountBadge
              title="Avg. Time till first Bite"
              unit="ms"
              icon="clock"
              count={ data.avgTimeTilFirstBite }
              change={ data.avgReqLoadProgress }
              oppositeColors
            />
            <Divider />
            <CountBadge
              title="Avg. Dom Complete Time"
              unit="ms"
              icon="clock"
              count={ data.avgDomCompleteTime }
              change={ data.avgReqLoadProgress }
              oppositeColors
            />
          </div>
        </Loader>
      </div>
    );
  }
}
