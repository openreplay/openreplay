// @ts-ignore
import { combineReducers } from 'redux-immutable';

import user from './user';

const rootReducer = combineReducers({
  user,
});

export type RootStore = ReturnType<typeof rootReducer>

export default rootReducer;
