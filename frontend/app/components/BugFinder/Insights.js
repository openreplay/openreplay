import { connect } from 'react-redux';
import styles from './insights.css';

const Insights = ({ insights }) => (
  <div className={ styles.notes }>
    <div className={ styles.tipText }>
      <i className={ styles.tipIcon } />
      {'This journey is only 2% of all the journeys but represents 20% of problems.'}
    </div>
    <div className={ styles.tipText }>
      <i className={ styles.tipIcon } />
      {'Lorem Ipsum 1290 events of 1500 events.'}
    </div>
  </div>
);

Insights.displayName = 'Insights';

export default connect(state => ({
  insights: state.getIn([ 'sessions', 'insights' ]),
}))(Insights);
