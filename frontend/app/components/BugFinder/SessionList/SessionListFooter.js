import { connect } from 'react-redux';
import { Button } from 'UI';
import styles from './sessionListFooter.css';

const SessionListFooter = ({
  displayedCount, totalCount, loading, onLoadMoreClick,
}) => (
  <div className={ styles.pageLoading }>
    <div className={ styles.countInfo }>
      { `Displaying ${ displayedCount } of ${ totalCount }` }
    </div>
    { totalCount > displayedCount &&
      <Button        
        onClick={ onLoadMoreClick }
        disabled={ loading }
        loading={ loading }
        outline
      >
        { 'Load more...' }
      </Button>
    }
  </div>
);

SessionListFooter.displayName = 'SessionListFooter';

export default connect(state => ({
  loading: state.getIn([ 'sessions', 'loading' ])  
}))(SessionListFooter);
