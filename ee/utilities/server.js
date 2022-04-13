const dumps = require('./utils/HeapSnapshot');
const {request_logger} = require('./utils/helper');
const express = require('express');
let socket;
if (process.env.redis === "true") {
    console.log("Using Redis");
    socket = require("./servers/websocket-cluster");
} else {
    socket = require("./servers/websocket");
}

const HOST = '0.0.0.0';
const PORT = 9001;

let debug = process.env.debug === "1" || false;
const PREFIX = process.env.prefix || `/assist`

if (process.env.uws !== "true") {
    let wsapp = express();
    wsapp.use(request_logger("[wsapp]"));
    wsapp.use(request_logger("[app]"));
    wsapp.use(`/heapdump/${process.env.S3_KEY}`, dumps.router);
    wsapp.use(`${PREFIX}/${process.env.S3_KEY}`, socket.wsRouter);
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
    uapp.get(PREFIX, healthFn);
    uapp.get(`${PREFIX}/`, healthFn);
    uapp.get(`${PREFIX}/${process.env.S3_KEY}`, healthFn);


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
    uapp.get(`${PREFIX}/${process.env.S3_KEY}/sockets-list`, uWrapper(socket.handlers.socketsList));
    uapp.get(`${PREFIX}/${process.env.S3_KEY}/sockets-list/:projectKey`, uWrapper(socket.handlers.socketsListByProject));

    uapp.get(`${PREFIX}/${process.env.S3_KEY}/sockets-live`, uWrapper(socket.handlers.socketsLive));
    uapp.get(`${PREFIX}/${process.env.S3_KEY}/sockets-live/:projectKey`, uWrapper(socket.handlers.socketsLiveByProject));


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