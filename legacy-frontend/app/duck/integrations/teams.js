import { Map, List } from 'immutable';
import withRequestState, { RequestTypes } from 'Duck/requestStateCreator';
import Config from 'Types/integrations/slackConfig';
import { createItemInListUpdater } from '../funcTools/tools';

const SAVE = new RequestTypes('msteams/SAVE');
const UPDATE = new RequestTypes('msteams/UPDATE');
const REMOVE = new RequestTypes('msteams/REMOVE');
const FETCH_LIST = new RequestTypes('msteams/FETCH_LIST');
const SEND_MSG = new RequestTypes('msteams/SEND_MSG');

const EDIT = 'msteams/EDIT';
const INIT = 'msteams/INIT';
const idKey = 'webhookId';
const itemInListUpdater = createItemInListUpdater(idKey);

const initialState = Map({
    instance: Config(),
    list: List(),
    loaded: false,
});

const reducer = (state = initialState, action = {}) => {
    switch (action.type) {
        case FETCH_LIST.REQUEST:
            return state.set('loaded', true);
        case FETCH_LIST.SUCCESS:
            return state.set('list', List(action.data).map(Config)).set('loaded', true);
        case UPDATE.SUCCESS:
        case SAVE.SUCCESS:
            const config = Config(action.data);
            return state.update('list', itemInListUpdater(config)).set('instance', config);
        case REMOVE.SUCCESS:
            return state.update('list', (list) => list.filter((item) => item.webhookId !== action.id)).set('instance', Config());
        case EDIT:
            return state.mergeIn(['instance'], action.instance);
        case INIT:
            return state.set('instance', Config(action.instance));
    }
    return state;
};

export default withRequestState(
    {
        fetchRequest: FETCH_LIST,
        saveRequest: SAVE,
        updateRequest: UPDATE,
        removeRequest: REMOVE,
    },
    reducer
);

export function fetchList() {
    return {
        types: FETCH_LIST.toArray(),
        call: (client) => client.get('/integrations/msteams/channels'),
    };
}

export function save(instance) {
    return {
        types: SAVE.toArray(),
        call: (client) => client.post(`/integrations/msteams`, instance.toData()),
    };
}

export function update(instance) {
    return {
        types: UPDATE.toArray(),
        call: (client) => client.post(`/integrations/msteams/${instance.webhookId}`, instance.toData()),
    };
}

export function edit(instance) {
    return {
        type: EDIT,
        instance,
    };
}

export function init(instance) {
    return {
        type: INIT,
        instance,
    };
}

export function remove(id) {
    return {
        types: REMOVE.toArray(),
        call: (client) => client.delete(`/integrations/msteams/${id}`),
        id,
    };
}

// https://api.openreplay.com/5587/integrations/msteams/notify/315/sessions/7856803626558104
//
export function sendMsTeamsMsg({ integrationId, entity, entityId, data }) {
    return {
        types: SEND_MSG.toArray(),
        call: (client) => client.post(`/integrations/msteams/notify/${integrationId}/${entity}/${entityId}`, data)
    }
}
