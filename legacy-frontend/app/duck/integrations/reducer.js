import { List, Map } from 'immutable';
import { createRequestReducer } from '../funcTools/request';
import { fetchListType, saveType, removeType, editType, initType, fetchType } from '../funcTools/types';
import { createItemInListUpdater } from '../funcTools/tools';

const idKey = 'siteId';
const itemInListUpdater = createItemInListUpdater(idKey);

export const createIntegrationReducer = (name, Config) => {
    const FETCH_LIST = fetchListType(name);
    const SAVE = saveType(name);
    const REMOVE = removeType(name);
    const EDIT = editType(name);
    const INIT = initType(name);
    const FETCH = fetchType(name);

    const initialState = Map({
        instance: Config(),
        list: List(),
        fetched: false,
        issuesFetched: false,
    });
    const reducer = (state = initialState, action = {}) => {
        switch (action.type) {
            case FETCH_LIST.success:
                return state
                    .set('list', Array.isArray(action.data) ? List(action.data).map(Config) : List([new Config(action.data)]))
                    .set(action.name + 'Fetched', true);
            case FETCH.success:
                return state.set('instance', Config(action.data || {}));
            case SAVE.success:
                const config = Config(action.data);
                return state.update('list', itemInListUpdater(config)).set('instance', config);
            case REMOVE.success:
                return state.update('list', (list) => list.filter((site) => site.siteId !== action.siteId)).set('instance', Config());
            case EDIT:
                return state.mergeIn(['instance'], action.instance);
            case INIT:
                return state.set('instance', Config(action.instance));
        }
        return state;
    };
    return createRequestReducer(
        {
            // fetchRequest: FETCH_LIST,
            fetchRequest: FETCH,
            saveRequest: SAVE,
            removeRequest: REMOVE,
        },
        reducer
    );
};
