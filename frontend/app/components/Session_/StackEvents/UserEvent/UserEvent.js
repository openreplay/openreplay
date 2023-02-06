import React from 'react';
import cn from 'classnames';
import { OPENREPLAY, SENTRY, DATADOG, STACKDRIVER } from 'Types/session/stackEvent';
import { Icon } from 'UI';
import withToggle from 'HOCs/withToggle';
import Sentry from './Sentry';
import JsonViewer from './JsonViewer';
import stl from './userEvent.module.css';
import { Duration } from 'luxon';
import JumpButton from 'Shared/DevTools/JumpButton';

// const modalSources = [ SENTRY, DATADOG ];

@withToggle() //
export default class UserEvent extends React.PureComponent {
  getIconProps() {
    const { source } = this.props.userEvent;
    return {
      name: `integrations/${source}`,
      size: 18,
      marginRight: source === OPENREPLAY ? 11 : 10,
    };
  }

  getLevelClassname() {
    const { userEvent } = this.props;
    if (userEvent.isRed()) return 'error color-red';
    return '';
  }

  onClickDetails = (e) => {
    e.stopPropagation();
    this.props.onDetailsClick(this.props.userEvent);
  };

  render() {
    const { userEvent, inactive, selected } = this.props;
    let message = userEvent.payload[0] || '';
    message = typeof message === 'string' ? message : JSON.stringify(message);
    return (
      <div
        data-scroll-item={userEvent.isRed()}
        onClick={this.onClickDetails}
        className={cn(
          'group flex items-center py-2 px-4 border-b cursor-pointer relative',
          // stl.userEvent,
          // this.getLevelClassname(),
          // {
          //   [stl.selected]: selected,
          // },
          'hover:bg-active-blue'
        )}
      >
        {/* <div className={'self-start pr-4'}>
          {Duration.fromMillis(userEvent.time).toFormat('mm:ss.SSS')}
        </div> */}
        <div className={cn('mr-auto flex items-start')}>
          <Icon {...this.getIconProps()} />
          <div>
            <div className="capitalize font-medium mb-1">{userEvent.name}</div>
            <div className="code-font text-xs">{message}</div>
          </div>
        </div>
        <JumpButton onClick={this.props.onJump} />
      </div>
    );
  }
}
