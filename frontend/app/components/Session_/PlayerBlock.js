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
    const { fullscreen, sessionId, disabled, activeTab, jiraConfig, fullView = false, isMultiview } = this.props;

    return (
      <div className={cn(styles.playerBlock, 'flex flex-col overflow-x-hidden')} style={{ minWidth: isMultiview ? '100%' : undefined }}>
        {!fullscreen && !fullView && !isMultiview && (
          <SubHeader sessionId={sessionId} disabled={disabled} jiraConfig={jiraConfig} />
        )}
        <Player
          className="flex-1"
          fullscreen={fullscreen}
          activeTab={activeTab}
          fullView={fullView}
          isMultiview={isMultiview}
        />
      </div>
    );
  }
}
