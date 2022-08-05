import { Map } from 'immutable';
import withRequestState from 'Duck/requestStateCreator';
import { fetchListType } from '../funcTools/types';
import { createRequestReducer } from '../funcTools/request';

const FETCH_LIST = fetchListType('integrations/FETCH_LIST');
const SET_SITE_ID = 'integrations/SET_SITE_ID';
const initialState = Map({
    list: [],
    siteId: null,
});
const reducer = (state = initialState, action = {}) => {
    switch (action.type) {
        case FETCH_LIST.success:
            return state.set('list', action.data);
        case SET_SITE_ID:
            return state.set('siteId', action.siteId);
    }
    return state;
};

export default createRequestReducer(
    {
        fetchRequest: FETCH_LIST,
    },
    reducer
);

export function fetchIntegrationList(siteID) {
    return {
        types: FETCH_LIST.array,
        call: (client) => client.get(`/${siteID}/integrations`),
    };
}

export function setSiteId(siteId) {
    return {
        type: SET_SITE_ID,
        siteId,
    };
}
