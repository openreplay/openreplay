const dumps = require('./utils/HeapSnapshot');
const {request_logger} = require('./utils/helper');
const express = require('express');
const assert = require('assert').strict;

let socket;
if (process.env.redis === "true") {
    socket = require("./servers/websocket-cluster");
} else {
    socket = require("./servers/websocket");
}

const HOST = process.env.LISTEN_HOST || '0.0.0.0';
const PORT = process.env.LISTEN_PORT || 9001;
assert.ok(process.env.ASSIST_KEY, 'The "ASSIST_KEY" environment variable is required');
const P_KEY = process.env.ASSIST_KEY;
const PREFIX = process.env.PREFIX || process.env.prefix || `/assist`

let debug = process.env.debug === "1";
const heapdump = process.env.heapdump === "1";

if (process.env.uws !== "true") {
    let wsapp = express();
    wsapp.use(express.json());
    wsapp.use(express.urlencoded({extended: true}));
    wsapp.use(request_logger("[wsapp]"));
    wsapp.get(['/', PREFIX, `${PREFIX}/`, `${PREFIX}/${P_KEY}`, `${PREFIX}/${P_KEY}/`], (req, res) => {
            res.statusCode = 200;
            res.end("ok!");
        }
    );
    heapdump && wsapp.use(`${PREFIX}/${P_KEY}/heapdump`, dumps.router);
    wsapp.use(`${PREFIX}/${P_KEY}`, socket.wsRouter);
    wsapp.enable('trust proxy');
    const wsserver = wsapp.listen(PORT, HOST, () => {
        console.log(`WS App listening on http://${HOST}:${PORT}`);
        console.log('Press Ctrl+C to quit.');
    });

    socket.start(wsserver);
    module.exports = {wsserver};
} else {
    console.log("Using uWebSocket");
    const {App} = require("uWebSockets.js");


    const uapp = new App();

    const healthFn = (res, req) => {
        res.writeStatus('200 OK').end('ok!');
    }
    uapp.get('/', healthFn);
    uapp.get(PREFIX, healthFn);
    uapp.get(`${PREFIX}/`, healthFn);
    uapp.get(`${PREFIX}/${P_KEY}`, healthFn);
    uapp.get(`${PREFIX}/${P_KEY}/`, healthFn);


    /* Either onAborted or simply finished request */
    const onAbortedOrFinishedResponse = function (res, readStream) {

        if (res.id === -1) {
            debug && console.log("ERROR! onAbortedOrFinishedResponse called twice for the same res!");
        } else {
            debug && console.log('Stream was closed');
            console.timeEnd(res.id);
            readStream.destroy();
        }

        /* Mark this response already accounted for */
        res.id = -1;
    }

    const uWrapper = function (fn) {
        return (res, req) => {
            res.id = 1;
            res.onAborted(() => {
                onAbortedOrFinishedResponse(res, readStream);
            });
            return fn(req, res);
        }
    }
    uapp.get(`${PREFIX}/${P_KEY}/sockets-list`, uWrapper(socket.handlers.socketsList));
    uapp.post(`${PREFIX}/${P_KEY}/sockets-list`, uWrapper(socket.handlers.socketsList));
    uapp.get(`${PREFIX}/${P_KEY}/sockets-list/:projectKey/autocomplete`, uWrapper(socket.handlers.autocomplete));
    uapp.get(`${PREFIX}/${P_KEY}/sockets-list/:projectKey`, uWrapper(socket.handlers.socketsListByProject));
    uapp.post(`${PREFIX}/${P_KEY}/sockets-list/:projectKey`, uWrapper(socket.handlers.socketsListByProject));
    uapp.get(`${PREFIX}/${P_KEY}/sockets-list/:projectKey/:sessionId`, uWrapper(socket.handlers.socketsListByProject));

    uapp.get(`${PREFIX}/${P_KEY}/sockets-live`, uWrapper(socket.handlers.socketsLive));
    uapp.post(`${PREFIX}/${P_KEY}/sockets-live`, uWrapper(socket.handlers.socketsLive));
    uapp.get(`${PREFIX}/${P_KEY}/sockets-live/:projectKey/autocomplete`, uWrapper(socket.handlers.autocomplete));
    uapp.get(`${PREFIX}/${P_KEY}/sockets-live/:projectKey`, uWrapper(socket.handlers.socketsLiveByProject));
    uapp.post(`${PREFIX}/${P_KEY}/sockets-live/:projectKey`, uWrapper(socket.handlers.socketsLiveByProject));
    uapp.get(`${PREFIX}/${P_KEY}/sockets-live/:projectKey/:sessionId`, uWrapper(socket.handlers.socketsLiveByProject));


    socket.start(uapp);

    uapp.listen(HOST, PORT, (token) => {
        if (!token) {
            console.warn("port already in use");
        }
        console.log(`WS App listening on http://${HOST}:${PORT}`);
        console.log('Press Ctrl+C to quit.');
    });


    process.on('uncaughtException', err => {
        console.log(`Uncaught Exception: ${err.message}`);
        debug && console.log(err.stack);
        // process.exit(1);
    });
    module.exports = {uapp};
}