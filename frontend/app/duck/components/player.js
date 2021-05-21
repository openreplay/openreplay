import { Map } from 'immutable';

export const NONE = 0;
export const CONSOLE = 1;
export const NETWORK = 2;
export const STACKEVENTS = 3;
export const STORAGE = 4;
export const PROFILER = 5;
export const PERFORMANCE = 6;
export const GRAPHQL = 7;
export const FETCH = 8;
export const EXCEPTIONS = 9;
export const LONGTASKS = 10;

const TOGGLE_FULLSCREEN = 'player/TOGGLE_FS';
const TOGGLE_BOTTOM_BLOCK = 'player/SET_BOTTOM_BLOCK';
const HIDE_HINT = 'player/HIDE_HINT';

const initialState = Map({
  fullscreen: false,
  bottomBlock: NONE,
  hiddenHints: Map({
    storage: localStorage.getItem('storageHideHint'),
    stack: localStorage.getItem('stackHideHint')
  }),
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case TOGGLE_FULLSCREEN:
      const { flag } = action
      return state.update('fullscreen', fs => typeof flag === 'boolean' ? flag : !fs);
    case TOGGLE_BOTTOM_BLOCK:
      const { bottomBlock } = action;
      if (state.get('bottomBlock') !== bottomBlock && bottomBlock !== NONE) {
      }
      return state.update('bottomBlock', bb => bb === bottomBlock ? NONE : bottomBlock);
    case HIDE_HINT:
      const { name } = action;
      localStorage.setItem(`${name}HideHint`, true);
      return state
        .setIn([ "hiddenHints", name ], true)
        .set('bottomBlock', NONE);

  }
  return state;
};

export default reducer;

export function toggleFullscreen(flag) {  
  return {
    type: TOGGLE_FULLSCREEN,
    flag,
  };
}
export function fullscreenOff() {
  return toggleFullscreen(false);
}
export function fullscreenOn() {
  return toggleFullscreen(true);
}

export function toggleBottomBlock(bottomBlock = NONE) {
  return {
    bottomBlock,
    type: TOGGLE_BOTTOM_BLOCK,
  };
}

export function closeBottomBlock() {
  return toggleBottomBlock();
}

export function hideHint(name) {
  return {
    name,
    type: HIDE_HINT,
  }
}