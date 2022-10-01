import React from 'react';
import cn from 'classnames';
import { OPENREPLAY, SENTRY, DATADOG, STACKDRIVER } from 'Types/session/stackEvent';
import { Icon, IconButton } from 'UI';
import withToggle from 'HOCs/withToggle';
import Sentry from './Sentry';
import JsonViewer from './JsonViewer';
import stl from './userEvent.module.css';
import { Duration } from 'luxon';

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
    //const message = this.getEventMessage();
    return (
      <div
        data-scroll-item={userEvent.isRed()}
        // onClick={ this.props.switchOpen } //
        onClick={this.props.onJump} //
        className={cn('group flex py-2 px-4 ', stl.userEvent, this.getLevelClassname(), {
          // [stl.inactive]: inactive,
          [stl.selected]: selected,
        })}
      >
        <div className={'self-start pr-4'}>
          {Duration.fromMillis(userEvent.time).toFormat('mm:ss.SSS')}
        </div>
        <div className={cn('mr-auto', stl.infoWrapper)}>
          <div className={stl.title}>
            <Icon {...this.getIconProps()} />
            {userEvent.name}
          </div>
        </div>
        <div className="self-center">
          <IconButton
            outline={!userEvent.isRed()}
            red={userEvent.isRed()}
            onClick={this.onClickDetails}
            label="DETAILS"
          />
        </div>
      </div>
    );
  }
}
