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
                    /* res.close calls onAborted */
                    // try {
                    //     res.close();
                    // } catch (e2) {
                    //     console.error(e2);
                    // }
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
const getCompressionConfig = function () {
    let perMessageDeflate = false;
    if (process.env.COMPRESSION_LEVEL && process.env.COMPRESSION_LEVEL > 0) {
        if (process.env.COMPRESSION_LEVEL > 3) {
            console.log(`WS compression level: ${process.env.COMPRESSION_LEVEL} not found, ignoring`);
        } else {
            let windowBits;
            switch (parseInt(process.env.COMPRESSION_LEVEL)) {
                case 1:
                    windowBits = 8;
                    break;
                case 2:
                    windowBits = 10;
                    break;
                case 3:
                    windowBits = 11;
                    break;
            }
            console.log(`WS compression level: ${process.env.COMPRESSION_LEVEL} => windowBits: ${windowBits}`);
            perMessageDeflate = {
                zlibDeflateOptions: {
                    windowBits: windowBits,
                    memLevel: 1
                },

                zlibInflateOptions: {
                    windowBits: windowBits
                }
            }
        }
    } else {
        console.log(`WS compression level: disabled`);
    }
    return perMessageDeflate;
}
const getUWSCompressionConfig = function () {
    let compression = uWS.DISABLED;
    if (process.env.UWS_COMPRESSION_LEVEL) {
        switch (process.env.UWS_COMPRESSION_LEVEL) {
            case 'SHARED_C':
                compression = uWS.SHARED_COMPRESSOR;
                break;
            case 'D_C_3':
                compression = uWS.DEDICATED_COMPRESSOR_3KB;
                break;
            case 'D_C_4':
                compression = uWS.DEDICATED_COMPRESSOR_4KB;
                break;
            case 'D_C_8':
                compression = uWS.DEDICATED_COMPRESSOR_8KB;
                break;
            case 'D_C_16':
                compression = uWS.DEDICATED_COMPRESSOR_16KB;
                break;
            case 'D_C_32':
                compression = uWS.DEDICATED_COMPRESSOR_32KB;
                break;
            case 'D_C_64':
                compression = uWS.DEDICATED_COMPRESSOR_64KB;
                break;
            case 'D_C_128':
                compression = uWS.DEDICATED_COMPRESSOR_128KB;
                break;
            case 'D_C_256':
                compression = uWS.DEDICATED_COMPRESSOR_256KB;
                break;
        }
        console.log(`WS UWS compression level: ${process.env.UWS_COMPRESSION_LEVEL} => ${compression}`);
    } else {
        console.log(`WS UWS compression level: disabled`);
    }
    return compression;
}
module.exports = {
    extractProjectKeyFromRequest,
    extractSessionIdFromRequest,
    extractPayloadFromRequest,
    getCompressionConfig,
    getUWSCompressionConfig
};