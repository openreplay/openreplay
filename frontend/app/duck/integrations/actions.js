import { array } from '../funcTools/tools';
import { fetchListType, fetchType, saveType, editType, initType, removeType } from '../funcTools/types';

export function fetchList(name) {
    return {
        types: fetchListType(name).array,
        call: (client) => client.get(`/integrations/${name}`),
        name,
    };
}

export function fetch(name, siteId) {
    return {
        types: fetchType(name).array,
        call: (client) => client.get(siteId && name !== 'github' && name !== 'jira' ? `/${siteId}/integrations/${name}` : `/integrations/${name}`),
        name,
    };
}

export function save(name, siteId, instance) {
    return {
        types: saveType(name).array,
        call: (client) => client.post((siteId ? `/${siteId}` : '') + `/integrations/${name}`, instance.toData()),
    };
}

export function edit(name, instance) {
    return {
        type: editType(name),
        instance,
    };
}

export function init(name, instance) {
    return {
        type: initType(name),
        instance,
    };
}

export function remove(name, siteId) {
    return {
        types: removeType(name).array,
        call: (client) => client.delete((siteId ? `/${siteId}` : '') + `/integrations/${name}`),
        siteId,
    };
}
