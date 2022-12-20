import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import Player from './Player';
import SubHeader from './Subheader';

import styles from './playerBlock.module.css';

@connect((state) => ({
  fullscreen: state.getIn(['components', 'player', 'fullscreen']),
  sessionId: state.getIn(['sessions', 'current']).sessionId,
  disabled: state.getIn(['components', 'targetDefiner', 'inspectorMode']),
  jiraConfig: state.getIn(['issues', 'list'])[0],
}))
export default class PlayerBlock extends React.PureComponent {
  render() {
    const { fullscreen, sessionId, disabled, activeTab, jiraConfig, fullView = false, isMultiview, isClickmap } = this.props;

    const shouldShowSubHeader = !fullscreen && !fullView && !isMultiview && !isClickmap
    return (
      <div className={cn(styles.playerBlock, 'flex flex-col', !isClickmap ? 'overflow-x-hidden' : 'overflow-visible')} style={{ zIndex: isClickmap ? 1 : undefined, minWidth: isMultiview || isClickmap ? '100%' : undefined }}>
        {shouldShowSubHeader ? (
          <SubHeader sessionId={sessionId} disabled={disabled} jiraConfig={jiraConfig} />
        ) : null}
        <Player
          className="flex-1"
          fullscreen={fullscreen}
          activeTab={activeTab}
          fullView={fullView}
          isMultiview={isMultiview}
          isClickmap={isClickmap}
        />
      </div>
    );
  }
}
