import { RequestType } from '../request';

export const initType = name => `${ name }/INIT`;
export const editType = name => `${ name }/EDIT`;
export const fetchType = name => new RequestType(`${ name }/FETCH`);
export const fetchToListType = name => new RequestType(`${ name }/FETCH_TO_LIST`);
export const fetchListType = name => new RequestType(`${ name }/FETCH_LIST`);
export const saveType = name => new RequestType(`${ name }/SAVE`);
export const removeType = name => new RequestType(`${ name }/REMOVE`);