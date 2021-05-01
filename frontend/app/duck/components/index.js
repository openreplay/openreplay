import { combineReducers } from 'redux-immutable';

import targetDefiner from './targetDefiner';
import resultsModal from './resultsModal';
import player from './player';

export default combineReducers({
  targetDefiner,
  resultsModal,
  player,
});
