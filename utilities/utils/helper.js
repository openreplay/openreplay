let PROJECT_KEY_LENGTH = parseInt(process.env.PROJECT_KEY_LENGTH) || 20;
let debug = process.env.debug === "1" || false;
const extractPeerId = (peerId) => {
    let splited = peerId.split("-");
    if (splited.length !== 2) {
        debug && console.error(`cannot split peerId: ${peerId}`);
        return {};
    }
    if (PROJECT_KEY_LENGTH > 0 && splited[0].length !== PROJECT_KEY_LENGTH) {
        debug && console.error(`wrong project key length for peerId: ${peerId}`);
        return {};
    }
    return {projectKey: splited[0], sessionId: splited[1]};
};
const request_logger = (identity) => {
    return (req, res, next) => {
        debug && console.log(identity, new Date().toTimeString(), 'REQUEST', req.method, req.originalUrl);
        res.on('finish', function () {
            if (this.statusCode !== 200 || debug) {
                console.log(new Date().toTimeString(), 'RESPONSE', req.method, req.originalUrl, this.statusCode);
            }
        })

        next();
    }
};
const extractProjectKeyFromRequest = function (req) {
    if (req.params.projectKey) {
        debug && console.log(`[WS]where projectKey=${req.params.projectKey}`);
        return req.params.projectKey;
    }
    return undefined;
}
const extractSessionIdFromRequest = function (req) {
    if (req.params.sessionId) {
        debug && console.log(`[WS]where sessionId=${req.params.sessionId}`);
        return req.params.sessionId;
    }
    return undefined;
}
const isValidSession = function (sessionInfo, filters) {
    let foundAll = true;
    for (const [key, body] of Object.entries(filters)) {
        let found = false;
        if (body.values !== undefined && body.values !== null) {
            for (const [skey, svalue] of Object.entries(sessionInfo)) {
                if (svalue !== undefined && svalue !== null) {
                    if (typeof (svalue) === "object") {
                        if (isValidSession(svalue, {[key]: body})) {
                            found = true;
                            break;
                        }
                    } else if (skey.toLowerCase() === key.toLowerCase()) {
                        for (let v of body["values"]) {
                            if (body.operator === "is" && String(svalue).toLowerCase() === v.toLowerCase()
                                || body.operator !== "is" && String(svalue).toLowerCase().indexOf(v.toLowerCase()) >= 0) {
                                found = true;
                                break;
                            }
                        }
                        if (found) {
                            break;
                        }
                    }
                }
            }
        }
        foundAll = foundAll && found;
        if (!found) {
            break;
        }
    }
    return foundAll;
}
const getValidAttributes = function (sessionInfo, query) {
    let matches = [];
    let deduplicate = [];
    for (const [skey, svalue] of Object.entries(sessionInfo)) {
        if (svalue !== undefined && svalue !== null) {
            if (typeof (svalue) === "object") {
                matches = [...matches, ...getValidAttributes(svalue, query)]
            } else if ((query.key === undefined || skey.toLowerCase() === query.key.toLowerCase())
                && String(svalue).toLowerCase().indexOf(query.value.toLowerCase()) >= 0
                && deduplicate.indexOf(skey + '_' + svalue) < 0) {
                matches.push({"type": skey.toUpperCase(), "value": svalue});
                deduplicate.push(skey + '_' + svalue);
            }
        }
    }
    return matches;
}
const hasFilters = function (filters) {
    return filters && filters.filter && Object.keys(filters.filter).length > 0;
}
const objectToObjectOfArrays = function (obj) {
    let _obj = {}
    if (obj) {
        for (let k of Object.keys(obj)) {
            if (obj[k] !== undefined && obj[k] !== null) {
                _obj[k] = obj[k];
                if (!Array.isArray(_obj[k].values)) {
                    _obj[k] = [_obj[k]];
                }
                for (let i = 0; i < _obj[k].values.length; i++) {
                    _obj[k].values[i] = String(_obj[k].values[i]);
                }
            }
        }
    }
    return _obj;
}
const transformFilters = function (filter) {
    for (let key of Object.keys(filter)) {
        //To support old v1.7.0 payload
        if (Array.isArray(filter[key]) || filter[key] === undefined || filter[key] === null) {
            debug && console.log(`[WS]old format for key=${key}`);
            filter[key] = {"values": filter[key]};
        }
        if (filter[key].operator) {
            debug && console.log(`[WS]where operator=${filter[key].operator}`);
        } else {
            debug && console.log(`[WS]where operator=DEFAULT-contains`);
            filter[key].operator = "contains";
        }
    }
    return filter;
}
const extractPayloadFromRequest = function (req) {
    let filters = {
        "query": {}, // for autocomplete
        "filter": {}, // for sessions search
        "sort": {
            "key": req.body.sort && req.body.sort.key ? req.body.sort.key : undefined,
            "order": req.body.sort && req.body.sort.order === "DESC"
        },
        "pagination": {
            "limit": req.body.pagination && req.body.pagination.limit ? req.body.pagination.limit : undefined,
            "page": req.body.pagination && req.body.pagination.page ? req.body.pagination.page : undefined
        }
    };
    if (req.query.q) {
        debug && console.log(`[WS]where q=${req.query.q}`);
        filters.query.value = req.query.q;
    }
    if (req.query.key) {
        debug && console.log(`[WS]where key=${req.query.key}`);
        filters.query.key = req.query.key;
    }
    if (req.query.userId) {
        debug && console.log(`[WS]where userId=${req.query.userId}`);
        filters.filter.userID = [req.query.userId];
    }
    filters.filter = objectToObjectOfArrays(filters.filter);
    filters.filter = {...filters.filter, ...(req.body.filter || {})};
    filters.filter = transformFilters(filters.filter);
    debug && console.log("payload/filters:" + JSON.stringify(filters))
    return filters;
}
const getValue = function (obj, key) {
    if (obj !== undefined && obj !== null) {
        let val;
        for (let k of Object.keys(obj)) {
            if (typeof (obj[k]) === "object") {
                val = getValue(obj[k], key);
            } else if (k.toLowerCase() === key.toLowerCase()) {
                val = obj[k];
            }

            if (val !== undefined) {
                return isNaN(val) ? val : Number(val);
            }
        }
    }
    return undefined;
}
const sortPaginate = function (list, filters) {
    if (typeof (list) === "object" && !Array.isArray(list)) {
        for (const [key, value] of Object.entries(list)) {
            list[key] = sortPaginate(value, filters);
        }
        return list
    }

    const total = list.length;
    list.sort((a, b) => {
        const tA = getValue(a, "timestamp");
        const tB = getValue(b, "timestamp");
        return tA < tB ? 1 : tA > tB ? -1 : 0;
    });
    if (filters.sort.order) {
        list.reverse();
    }
    if ((filters.sort.key || "timestamp") !== "timestamp") {
        list.sort((a, b) => {
            const vA = getValue(a, filters.sort.key);
            const vB = getValue(b, filters.sort.key);
            return vA > vB ? 1 : vA < vB ? -1 : 0;
        });
    }
    if (filters.sort.order) {
        list.reverse();
    }

    if (filters.pagination.page && filters.pagination.limit) {
        list = list.slice((filters.pagination.page - 1) * filters.pagination.limit,
            filters.pagination.page * filters.pagination.limit);
    }
    return {"total": total, "sessions": list};
}
const uniqueAutocomplete = function (list) {
    let _list = [];
    let deduplicate = [];
    for (let e of list) {
        if (deduplicate.indexOf(e.type + "_" + e.value) < 0) {
            _list.push(e);
            deduplicate.push(e.type + "_" + e.value)
        }
    }
    return _list;
}
module.exports = {
    transformFilters,
    extractPeerId,
    request_logger,
    getValidAttributes,
    extractProjectKeyFromRequest,
    extractSessionIdFromRequest,
    isValidSession,
    hasFilters,
    objectToObjectOfArrays,
    extractPayloadFromRequest,
    sortPaginate,
    uniqueAutocomplete
};