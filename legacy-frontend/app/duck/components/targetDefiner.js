import { Map } from 'immutable';
import Target from 'Types/target';
import TargetCustom from 'Types/targetCustom';

const EDIT = 'targetDefiner/EDIT';
const SHOW = 'targetDefiner/SHOW';
const HIDE = 'targetDefiner/HIDE';
const TOGGLE_INSPECTOR_MODE = 'targetDefiner/TOGGLE_INSPECTOR_MODE';

const initialState = Map({
  isDisplayed: false,
  target: Target(),
  inspectorMode: false,
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case EDIT:
      return state.setIn([ 'target', 'label' ], action.label);
    case SHOW:
      const target = action.target && !action.target.isCustom 
        ? Target(action.target)
        : TargetCustom(action.target);
      return state
        .set('isDisplayed', true)
        .set('target', target)
        .set('inspectorMode', false);
    case HIDE:
      return state
        .set('isDisplayed', false)
        .set('target', Target())
    case TOGGLE_INSPECTOR_MODE:
      const inspectorMode = action.flag !== undefined
        ? action.flag
        : !state.get('inspectorMode');
      let returnState = state.set('inspectorMode', inspectorMode);
      if (inspectorMode) {
        returnState = returnState.set('isDisplayed', false).set('target', Target());
      }
      return returnState;
  }
  return state;
};

export default reducer;

export function show(target) {
  return {
    type: SHOW,
    target,
  };
}

export function hide() {
  return {
    type: HIDE,
  };
}

export function edit(label) {
  return {
    type: EDIT,
    label,
  };
}

export function toggleInspectorMode(flag) {
  return {
    type: TOGGLE_INSPECTOR_MODE,
    flag,
  };
}
