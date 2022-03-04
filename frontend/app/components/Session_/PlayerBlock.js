import cn from "classnames";
import { connect } from 'react-redux';
import { scale as scalePlayerScreen } from 'Player'; 
import { 
  NONE,
  CONSOLE,
  NETWORK,
  STACKEVENTS,
  STORAGE,
  PROFILER,
  PERFORMANCE,
  GRAPHQL,
  FETCH,
  EXCEPTIONS,
  LONGTASKS,
  INSPECTOR,
} from 'Duck/components/player';
import Player from './Player';
import Network from './Network';
import Console from './Console/Console';
import StackEvents from './StackEvents/StackEvents';
import Storage from './Storage';
import Profiler from './Profiler';
import { ConnectedPerformance } from './Performance';
import GraphQL from './GraphQL';
import Fetch from './Fetch';
import Exceptions from './Exceptions/Exceptions';
import LongTasks from './LongTasks';
import Inspector from './Inspector';
import styles from './playerBlock.css';


@connect(state => ({
  fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
  bottomBlock: state.getIn([ 'components', 'player', 'bottomBlock' ]),
}))
export default class PlayerBlock extends React.PureComponent {
  componentDidUpdate(prevProps) {
    if ([ prevProps.bottomBlock, this.props.bottomBlock ].includes(NONE) || 
        prevProps.fullscreen !== this.props.fullscreen) {
      scalePlayerScreen();
    }
  }

  render() {
    const { fullscreen, bottomBlock } = this.props;

    return (
      <div className={ cn(styles.playerBlock, "flex flex-col") }>
        <Player
          className="flex-1"
          bottomBlockIsActive={ !fullscreen && bottomBlock !== NONE }
        />
        { !fullscreen && !!bottomBlock &&
          <div className="">
            { bottomBlock === CONSOLE &&
              <Console />
            }
            { bottomBlock === NETWORK &&
              <Network />
            }
            { bottomBlock === STACKEVENTS && 
              <StackEvents />
            }
            { bottomBlock === STORAGE &&
              <Storage />
            }
            { bottomBlock === PROFILER &&
              <Profiler />
            }
            { bottomBlock === PERFORMANCE &&
              <ConnectedPerformance />
            }
            { bottomBlock === GRAPHQL && 
              <GraphQL />
            }
            { bottomBlock === FETCH && 
              <Fetch />
            }
            { bottomBlock === EXCEPTIONS &&
              <Exceptions />
            }
            { bottomBlock === LONGTASKS &&
              <LongTasks />
            }
            { bottomBlock === INSPECTOR &&
              <Inspector />
            }
          </div>
        }
      </div>
    );
  }
}
