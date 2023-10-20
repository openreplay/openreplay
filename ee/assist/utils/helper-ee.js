const uWS = require("uWebSockets.js");
const helper = require('./helper');
let debug = process.env.debug === "1";
const getBodyFromUWSResponse = async function (res) {
    return new Promise(((resolve, reject) => {
        let buffer;
        res.onData((ab, isLast) => {
            let chunk = Buffer.from(ab);
            if (buffer) {
                buffer = Buffer.concat([buffer, chunk]);
            } else {
                buffer = Buffer.concat([chunk]);
            }
            if (isLast) {
                let json;
                try {
                    json = JSON.parse(buffer);
                } catch (e) {
                    console.error(e);
                    json = {};
                }
                resolve(json);
            }
        });
    }));
}
const extractProjectKeyFromRequest = function (req) {
    if (process.env.uws === "true") {
        if (req.getParameter(0)) {
            debug && console.log(`[WS]where projectKey=${req.getParameter(0)}`);
            return req.getParameter(0);
        }
    } else {
        return helper.extractProjectKeyFromRequest(req);
    }
    return undefined;
}
const extractSessionIdFromRequest = function (req) {
    if (process.env.uws === "true") {
        if (req.getParameter(1)) {
            debug && console.log(`[WS]where projectKey=${req.getParameter(1)}`);
            return req.getParameter(1);
        }
    } else {
        return helper.extractSessionIdFromRequest(req);
    }
    return undefined;
}
const extractPayloadFromRequest = async function (req, res) {
    let filters = {
        "query": {},
        "filter": {}
    };
    if (process.env.uws === "true") {
        if (req.getQuery("q")) {
            debug && console.log(`[WS]where q=${req.getQuery("q")}`);
            filters.query.value = req.getQuery("q");
        }
        if (req.getQuery("key")) {
            debug && console.log(`[WS]where key=${req.getQuery("key")}`);
            filters.query.key = req.getQuery("key");
        }
        if (req.getQuery("userId")) {
            debug && console.log(`[WS]where userId=${req.getQuery("userId")}`);
            filters.filter.userID = [req.getQuery("userId")];
        }
        if (!filters.query.value) {
            let body = {};
            if (req.getMethod() !== 'get') {
                body = await getBodyFromUWSResponse(res);
            }
            filters = {
                ...filters,
                "sort": {
                    "key": body.sort && body.sort.key ? body.sort.key : undefined,
                    "order": body.sort && body.sort.order === "DESC"
                },
                "pagination": {
                    "limit": body.pagination && body.pagination.limit ? body.pagination.limit : undefined,
                    "page": body.pagination && body.pagination.page ? body.pagination.page : undefined
                }
            }
            filters.filter = {...filters.filter, ...(body.filter || {})};
        }
    } else {
        return helper.extractPayloadFromRequest(req);
    }
    filters.filter = helper.objectToObjectOfArrays(filters.filter);
    filters.filter = helper.transformFilters(filters.filter);
    debug && console.log("payload/filters:" + JSON.stringify(filters))
    return Object.keys(filters).length > 0 ? filters : undefined;
}
const getAvailableRooms = async function (io) {
    if (process.env.redis === "true") {
        return io.of('/').adapter.allRooms();
    } else {
        return helper.getAvailableRooms(io);
    }
}
const getCompressionConfig = function () {
    if (process.env.uws !== "true") {
        return helper.getCompressionConfig();
    } else {
        // uWS: The theoretical overhead per socket is 32KB (8KB for compressor and for 24KB decompressor)
        if (process.env.COMPRESSION === "true") {
            console.log(`uWS compression: enabled`);
            return {
                compression: uWS.DEDICATED_COMPRESSOR_8KB,
                decompression: uWS.DEDICATED_DECOMPRESSOR_1KB
            };
        } else {
            console.log(`uWS compression: disabled`);
            return {};
        }
    }

}

module.exports = {
    extractProjectKeyFromRequest,
    extractSessionIdFromRequest,
    extractPayloadFromRequest,
    getCompressionConfig,
    getAvailableRooms
};