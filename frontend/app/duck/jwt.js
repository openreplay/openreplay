export const UPDATE = 'jwt/UPDATE';
export const DELETE = 'jwt/DELETE';

export default (state = null, action = {}) => {
  switch (action.type) {
    case UPDATE:
      return action.data;
    case DELETE:
      return null;
  }
  return state;
};

export function setJwt(data) {
  return {
    type: UPDATE,
    data,
  };
}
