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
    for (const [key, values] of Object.entries(filters)) {
        let found = false;
        if (values !== undefined && values !== null) {
            for (const [skey, svalue] of Object.entries(sessionInfo)) {
                if (svalue !== undefined && svalue !== null) {
                    if (typeof (svalue) === "object") {
                        if (isValidSession(svalue, {[key]: values})) {
                            found = true;
                            break;
                        }
                    } else if (skey.toLowerCase() === key.toLowerCase()) {
                        for (let v of values) {
                            if (String(svalue).toLowerCase().indexOf(v.toLowerCase()) >= 0) {
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
                if (!Array.isArray(_obj[k])) {
                    _obj[k] = [_obj[k]];
                }
                for (let i = 0; i < _obj[k].length; i++) {
                    _obj[k][i] = String(_obj[k][i]);
                }
            }
        }
    }
    return _obj;
}
const extractPayloadFromRequest = function (req) {
    let filters = {
        "query": {},
        "filter": {},
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
                return val;
            }
        }
    }
    return undefined;
}
const sortPaginate = function (list, filters) {
    const total = list.length;
    list.sort((a, b) => {
        const vA = getValue(a, filters.sort.key || "timestamp");
        const vB = getValue(b, filters.sort.key || "timestamp");
        return vA > vB ? 1 : vA < vB ? -1 : 0;
    });

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