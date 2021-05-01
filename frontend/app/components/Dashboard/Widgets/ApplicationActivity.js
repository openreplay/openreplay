import { Loader } from 'UI';
import { msToSec } from 'App/date';
import { CountBadge, Divider, widgetHOC } from './common';

@widgetHOC('applicationActivity')
export default class ApplicationActivity extends React.PureComponent {
  render() {
    const { data, loading } = this.props;
    return (
      <div className="flex-1 flex-shrink-0  flex justify-around items-center">
        <Loader loading={ loading } size="small">
          <CountBadge
            title="Avg. Page Load Time"
            unit="s"
            icon="window"
            count={ msToSec(data.avgPageLoad) }
            change={ data.avgPageLoadProgress }
            oppositeColors
          />
          <Divider />
          <CountBadge
            title="Avg. Image Load Time"
            unit="ms"
            icon="eye"
            count={ data.avgImgLoad }
            change={ data.avgImgLoadProgress }
            oppositeColors
          />
          <Divider />
          <CountBadge
            title="Avg. Request Load"
            unit="ms"
            icon="clock"
            count={ data.avgReqLoad }
            change={ data.avgReqLoadProgress }
            oppositeColors
          />
        </Loader>
      </div>
    );
  }
}
