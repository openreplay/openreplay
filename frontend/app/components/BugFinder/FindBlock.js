import { connect } from 'react-redux';
import { Button } from 'UI';
import { applyFilter } from 'Duck/filters';
import styles from './findBlock.css';

@connect(state => ({
  eventsCount: state.getIn([ 'filters', 'appliedFilter', 'events' ]).size,
  lodaing: state.getIn([ 'sessions', 'loading' ]),
}), {
  applyFilter,
})
export default class FindBlock extends React.PureComponent {
  onClick = () => this.props.applyFilter()
  render() {
    const { lodaing, eventsCount } = this.props;

    return (
      <div className={ styles.findBlock }>
        <div>
          <Button
            className={ styles.findButton }
            onClick={ this.onClick }
            primary
            loading={ lodaing }
            disabled={ eventsCount === 0 }
          >
            {'Find Sessions'}
          </Button>
        </div>
      </div>
    );
  }
}
