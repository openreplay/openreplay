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
} from 'Duck/components/player';

import Network from './Network';
import Console from './Console/Console';
import StackEvents from './StackEvents/StackEvents';
import Storage from './Storage';
import Profiler from './Profiler';
import Performance from './Performance';
import PlayerBlockHeader from './PlayerBlockHeader';
import GraphQL from './GraphQL';
import Fetch from './Fetch';
import Exceptions from './Exceptions/Exceptions';
import LongTasks from './LongTasks';


const tabs = [
  {
    key: CONSOLE,
    Component: Console,
  },
  {
    key: NETWORK,
    Component: Network,
  },
  {
    key: STORAGE,
    Component: 
  }
]

const tabsByKey = {};
tabs.map()


export function switchTab(tabKey) {
  tabKey
}


