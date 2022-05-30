import React from 'react';
import cn from "classnames";
import { connect } from 'react-redux';
import {  } from 'Player';
import {
  NONE,
} from 'Duck/components/player';
import Player from './Player';
import SubHeader from './Subheader';

import styles from './playerBlock.css';

@connect(state => ({
  fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
  bottomBlock: state.getIn([ 'components', 'player', 'bottomBlock' ]),
  sessionId: state.getIn([ 'sessions', 'current', 'sessionId' ]),
  disabled: state.getIn([ 'components', 'targetDefiner', 'inspectorMode' ]),
}))
export default class PlayerBlock extends React.PureComponent {
  render() {
    const { fullscreen, bottomBlock, sessionId, disabled, previousId, nextId, setAutoplayValues, activeTab } = this.props;

    return (
      <div className={ cn(styles.playerBlock, "flex flex-col") }>
          <SubHeader
            sessionId={sessionId}
            disabled={disabled}
          />
        <Player
          className="flex-1"
          bottomBlockIsActive={ !fullscreen && bottomBlock !== NONE }
          bottomBlock={bottomBlock}
          fullscreen={fullscreen}
          activeTab={activeTab}
        />
      </div>
    );
  }
}
