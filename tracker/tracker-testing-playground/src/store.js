const initialState = {
  value: 0,
  test: { key: 'test' },
  deleteMe: 'a',
  arr: [],
}

export function counterReducer(state = initialState, action) {
  switch (action.type) {
    case 'counter/incremented':
      return { ...state, value: state.value + 1 }
    case 'counter/decremented':
      return { ...state, value: state.value - 1 }
    case 'counter/test':
      return { ...state, test: { key: 'value1' }, deleteMe: 'asasd'}
    case 'couter/test2':
      return { ...state, test: { key: 'value2' }, deleteMe: null }
    case 'couter/test3':
      return { ...state, test: { key: null }, deleteMe: 'aaaaa', arr: [2,2,23,3] }
    default:
      return state
  }
}
