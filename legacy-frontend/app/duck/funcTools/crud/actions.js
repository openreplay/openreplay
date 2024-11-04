import {
  initType,
  editType,
  fetchType,
  fetchToListType,
  fetchListType,
  saveType,
  removeType,
} from './types';
import {
  array
} from '../tools';

const pluralise = name => `${ name }s`;

export const createInit = name => instance => ({
  type: initType(name),
  instance,
});

export const createFetch = (name, endpoint = id => `/${ pluralise(name) }/${ id }` ) => {
  const fetchTypeArray = array(fetchType(name));
  const fetchToListTypeArray = array(fetchToListType(name));
  return (id, options = { thenInit: true }) => (dispatch, getState) =>  {
    const itemInList = getState().getIn([ name, 'list' ]).find(item => item[ idKey ] === id);
    if (!itemInList || !itemInList.isComplete()) { // name of func?
      return dispatch({
        types: options.thenInit ? fetchTypeArray : fetchToListTypeArray,
        call: client => client.get(endpoint(id)),
      });
    }
    if (options.thenInit) dispatch(createInit(name)(itemInList));
    return Promise.resolve();
  };
};

export const createFetchList = (name, endpoint = `/${ pluralise(name) }`) => {
  const types = array(fetchListType(name));
  return params => ({
    types,
    call: client => client.get(endpoint, params),
  });
};

export const createEdit = (name) => {
  const type = editType(name);
  return instance => ({
    type,
    instance,
  });
};

export const createSave = (name, endpoint = `/${ pluralise(name) }`) => {
  const types = array(saveType(name));
  return instance => ({
    types,
    call: client => client.put(endpoint, instance.toData()),
  });
};

export const createUpdate = (name, endpoint = id => `/${ pluralise(name) }/${id}`) => {
  const types = array(saveType(name));
  return instance => ({
    types,
    call: client => client.put(endpoint(instance.id), instance.toData()),
    id: instance.id,
  });
};

export const createRemove = (name, endpoint = id => `/${ pluralise(name) }/${ id }`) => {
  const types = array(removeType(name));
  return id => ({
    types,
    call: client => client.delete(endpoint(id)),
    id,
  });
};