import React from 'react';
import { diffFromNowString } from 'App/date';
import { TextEllipsis } from 'UI';

import styles from './resourceInfo.module.css';

export default class ResourceInfo extends React.PureComponent {
  render() {
    const { data } = this.props;
    return (
      <div className="flex flex-col" >
        <TextEllipsis className={ styles.name } text={ data.url } hintText={ data.url } />
        <div className={ styles.timings }>
          { data.endedAt && data.startedAt && `${ diffFromNowString(data.endedAt) } ago - ${ diffFromNowString(data.startedAt) } old` }
        </div>
      </div>
    );
  }
}
