import { combineReducers } from 'redux-immutable';

import targetDefiner from './targetDefiner';
import player from './player';

export default combineReducers({
  targetDefiner,
  player,
});
