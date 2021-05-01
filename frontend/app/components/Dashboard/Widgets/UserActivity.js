import { connect } from 'react-redux';
import { msToMin } from 'App/date';
import { Loader } from 'UI';
import { CountBadge, Divider, widgetHOC } from './common';

@widgetHOC('userActivity')
export default class UserActivity extends React.PureComponent {
  render() {
    const { data, loading } = this.props;
    return (
      <div className="flex justify-around items-center flex-1 flex-shrink-0">
        <Loader loading={ loading } size="small">          
          <CountBadge 
            title="Avg. no. of Visited Pages" 
            icon="file" 
            count={ data.avgVisitedPages } 
            change={ data.avgVisitedPagesProgress }
          />
          <Divider />
          <CountBadge 
            title="Avg. Session Duration" 
            icon="clock" 
            unit="min" 
            count={ msToMin(data.avgDuration) } 
            change={ data.avgDurationProgress }
          />
        </Loader>
      </div>
    );
  }
}
