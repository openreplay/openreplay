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
const isValidSession = function (sessionInfo, filters) {
    let foundAll = true;
    for (const [key, values] of Object.entries(filters)) {
        let found = false;
        for (const [skey, svalue] of Object.entries(sessionInfo)) {
            if (skey.toLowerCase() === key.toLowerCase()) {
                for (let v of values) {
                    if (svalue.toLowerCase().indexOf(v.toLowerCase()) >= 0) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }
        }
        foundAll &&= found;
        if (!found) {
            break;
        }
    }
    return foundAll;
}
const hasFilters = function (filters) {
    return filters !== undefined && Object.keys(filters).length > 0;
}
const objectToObjectOfArrays = function (obj) {
    let _obj = {}
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
    return _obj;
}
const extractFiltersFromRequest = function (req) {
    let filters = {};
    if (req.query.userId) {
        debug && console.log(`[WS]where userId=${req.query.userId}`);
        filters.userID = [req.query.userId];
    }
    filters = objectToObjectOfArrays({...filters, ...req.body});
    return Object.keys(filters).length > 0 ? filters : undefined;
}
module.exports = {
    extractPeerId, request_logger, isValidSession, hasFilters, objectToObjectOfArrays, extractFiltersFromRequest
};