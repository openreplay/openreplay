import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { setAutoplayValues } from 'Duck/sessions';
import { session as sessionRoute } from 'App/routes';
import { Link, Icon, Toggler, Tooltip } from 'UI';
import cn from 'classnames';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

function Autoplay(props) {
  const { previousId, nextId, disabled } = props;
  const { player, store } = React.useContext(PlayerContext)

  const { autoplay } = store.get()
  const { toggleAutoplay } = player

  useEffect(() => {
    props.setAutoplayValues();
  }, []);

  return (
    <div className="flex items-center">
      <div
        onClick={toggleAutoplay}
        className="cursor-pointer flex items-center mr-2 hover:bg-gray-light-shade rounded-md p-2"
      >
        <Toggler name="sessionsLive" onChange={toggleAutoplay} checked={autoplay} />
        <span className="ml-2 whitespace-nowrap">Auto-Play</span>
      </div>

      <Tooltip
        placement="bottom"
        title={<div className="whitespace-nowrap">Play Previous Session</div>}
        disabled={!previousId}
      >
        <Link to={sessionRoute(previousId)} disabled={!previousId}>
          <div
            className={cn(
              'p-1 bg-gray-bg group rounded-full color-gray-darkest font-medium',
              previousId && 'cursor-pointer',
              !disabled && nextId && 'hover:bg-bg-blue'
            )}
          >
            <Icon name="prev1" className="group-hover:fill-main" color="inherit" size="16" />
          </div>
        </Link>
      </Tooltip>

      <Tooltip
        placement="bottom"
        title={<div className="whitespace-nowrap">Play Next Session</div>}
        disabled={!nextId}
      >
        <Link to={sessionRoute(nextId)} disabled={!nextId}>
          <div
            className={cn(
              'p-1 bg-gray-bg group ml-1 rounded-full color-gray-darkest font-medium',
              nextId && 'cursor-pointer',
              !disabled && nextId && 'hover:bg-bg-blue'
            )}
          >
            <Icon name="next1" className="group-hover:fill-main" color="inherit" size="16" />
          </div>
        </Link>
      </Tooltip>
    </div>
  );
}

const connectAutoplay = connect(
  (state) => ({
    previousId: state.getIn(['sessions', 'previousId']),
    nextId: state.getIn(['sessions', 'nextId']),
  }),
  { setAutoplayValues }
);

export default connectAutoplay(
  observer(Autoplay)
);
