import { diffFromNowString } from 'App/date';
import { TextEllipsis } from 'UI';
import styles from './errorInfo.css';

export default class ErrorInfo extends React.PureComponent {
  findJourneys = () => this.props.findJourneys(this.props.data.error)

  render() {
    const { data } = this.props;
    return (
      <div className="flex flex-col" >
        <TextEllipsis
          onClick={ this.findJourneys }
          className={ styles.errorText  }
          text={ data.error }
          popupProps={{
            position: 'left center',
            wide: 'very',
            offset: '100',
            positionFixed: true,
            size: 'small'
          }}
        />
        <div className={ styles.timings }>
          { `${ diffFromNowString(data.lastOccurrenceAt) } ago - ${ diffFromNowString(data.firstOccurrenceAt) } old` }
        </div>
      </div>
    );
  }
}
