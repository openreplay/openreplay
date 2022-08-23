import { observer } from 'mobx-react-lite';
import { CUSTOM } from 'Player/ios/state';

import StackEvents from '../Layout/ToolPanel/StackEvents';

export default observer(({ player }) => <StackEvents stackEvents={player.lists[CUSTOM].listNow} />);
