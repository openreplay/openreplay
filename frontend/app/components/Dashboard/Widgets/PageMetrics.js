import { connect } from 'react-redux';
import { Loader } from 'UI';
import { CountBadge, Divider, widgetHOC } from './common';

@widgetHOC('pageMetrics')
export default class PageMetrics extends React.PureComponent {
  render() {
    const { data, loading } = this.props;
    return (
      <div className="flex-1 flex-shrink-0  flex justify-around items-center">
        <Loader loading={ loading } size="small">
          <CountBadge
            title="Avg. Dom Load Time"
            unit="ms"
            icon="file"
            count={ data.avgLoad }
            change={ data.avgLoadProgress }
            oppositeColors
          />
          <Divider />
          <CountBadge
            title="Avg. First Meaningful Paint"
            unit="ms"
            icon="file"
            count={ data.avgFirstContentfulPixel }
            change={ data.avgFirstContentfulPixelProgress }
            oppositeColors
          />
        </Loader>
      </div>
    );
  }
}
