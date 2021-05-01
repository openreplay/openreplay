import { diffFromNowString } from 'App/date';
import { TextEllipsis } from 'UI';

import styles from './resourceInfo.css';

export default class ResourceInfo extends React.PureComponent {
  render() {
    const { data } = this.props;
    return (
      <div className="flex flex-col" >
        <TextEllipsis className={ styles.name } text={ data.name } hintText={ data.url } />
        <div className={ styles.timings }>
          { `${ diffFromNowString(data.endedAt) } ago - ${ diffFromNowString(data.startedAt) } old` }
        </div>
      </div>
    );
  }
}
