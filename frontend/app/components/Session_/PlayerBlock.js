import React from 'react';
import cn from "classnames";
import { connect } from 'react-redux';
import {  } from 'Player';
import {
  NONE, OVERVIEW,
} from 'Duck/components/player';
import Player from './Player';
import SubHeader from './Subheader';

import styles from './playerBlock.module.css';

@connect(state => ({
  fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
  bottomBlock: state.getIn([ 'components', 'player', 'bottomBlock' ]),
  sessionId: state.getIn([ 'sessions', 'current', 'sessionId' ]),
  disabled: state.getIn([ 'components', 'targetDefiner', 'inspectorMode' ]),
  jiraConfig: state.getIn([ 'issues', 'list' ]).first(),
}))
export default class PlayerBlock extends React.PureComponent {
  render() {
    const {
      fullscreen,
      bottomBlock,
      sessionId,
      disabled,
      activeTab,
      jiraConfig,
     } = this.props;

    return (
      <div className={ cn(styles.playerBlock, "flex flex-col overflow-x-hidden") }>
          {!fullscreen && <SubHeader
            sessionId={sessionId}
            disabled={disabled}
            jiraConfig={jiraConfig}
          />}
        <Player
          className="flex-1"
          bottomBlockIsActive={ !fullscreen && bottomBlock !== NONE }
          // bottomBlockIsActive={ true }
          bottomBlock={bottomBlock}
          fullscreen={fullscreen}
          activeTab={activeTab}
        />
      </div>
    );
  }
}
