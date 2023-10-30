import { Map, List } from 'immutable';
import withRequestState, { RequestTypes } from 'Duck/requestStateCreator';
import Config from 'Types/integrations/slackConfig';
import { createItemInListUpdater } from '../funcTools/tools';

const SAVE = new RequestTypes('slack/SAVE');
const UPDATE = new RequestTypes('slack/UPDATE');
const REMOVE = new RequestTypes('slack/REMOVE');
const FETCH_LIST = new RequestTypes('slack/FETCH_LIST');
const SEND_MSG = new RequestTypes('slack/SEND_MSG');
const EDIT = 'slack/EDIT';
const INIT = 'slack/INIT';
const idKey = 'webhookId';
const itemInListUpdater = createItemInListUpdater(idKey);

const initialState = Map({
    instance: Config(),
    loaded: false,
    list: List(),
});

const reducer = (state = initialState, action = {}) => {
    switch (action.type) {
        case FETCH_LIST.REQUEST:
            return state.set('loaded', true);
        case FETCH_LIST.SUCCESS:
            return state.set('list', List(action.data).map(Config)).set('loaded', true)
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
        call: (client) => client.get('/integrations/slack/channels'),
    };
}

export function save(instance) {
    return {
        types: SAVE.toArray(),
        call: (client) => client.post(`/integrations/slack`, instance.toData()),
    };
}

export function update(instance) {
    return {
        types: UPDATE.toArray(),
        call: (client) => client.post(`/integrations/slack/${instance.webhookId}`, instance.toData()),
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
        call: (client) => client.delete(`/integrations/slack/${id}`),
        id,
    };
}

// https://api.openreplay.com/5587/integrations/slack/notify/315/sessions/7856803626558104
//
export function sendSlackMsg({ integrationId, entity, entityId, data }) {
    return {
        types: SEND_MSG.toArray(),
        call: (client) => client.post(`/integrations/slack/notify/${integrationId}/${entity}/${entityId}`, data)
    }
}
