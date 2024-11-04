import {
  editInListType,
} from './types';

export const createEditInList = (name) => {
  const type = editInListType(name);
  return item => ({
    type,
    item,
  });
};

export { createFetchList } from '../crud';