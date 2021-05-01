import { connect } from 'react-redux';
import { Loader, NoContent } from 'UI';
import { widgetHOC, SessionLine } from '../common';

@widgetHOC('sessionsPerformance', { fitContent: true })
export default class LastFeedbacks extends React.PureComponent {
  render() {
    const { data: sessions, loading } = this.props;
    return (
      <Loader loading={ loading } size="small">
        <NoContent
          title="No data available."
          size="small"
          show={ sessions.size === 0 }
        >
          { sessions.map(({ sessionId, missedResources }) => (
            <SessionLine 
              sessionId={ sessionId }
              icon="file"
              info={ missedResources.get(0).name }
              subInfo="Missing File"
            />
          ))}
        </NoContent>
      </Loader>
    );
  }
}
