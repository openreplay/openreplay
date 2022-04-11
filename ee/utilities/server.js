const dumps = require('./utils/dump');
const sourcemapsReaderServer = require('./servers/sourcemaps-server');
const {peerRouter, peerConnection, peerDisconnect, peerError} = require('./servers/peerjs-server');
const express = require('express');
const {ExpressPeerServer} = require('peer');
let socket;
if (process.env.redis === "true") {
    console.log("Using Redis");
    socket = require("./servers/websocket-cluster");
} else {
    socket = require("./servers/websocket");
}

const HOST = '0.0.0.0';
const PORT = 9000;

const app = express();

let debug = process.env.debug === "1" || false;
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
app.use(request_logger("[app]"));


app.use('/sourcemaps', sourcemapsReaderServer);
app.use('/assist', peerRouter);

const server = app.listen(PORT, HOST, () => {
    console.log(`App listening on http://${HOST}:${PORT}`);
    console.log('Press Ctrl+C to quit.');
});

const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/',
    proxied: true,
    allow_discovery: false
});
peerServer.on('connection', peerConnection);
peerServer.on('disconnect', peerDisconnect);
peerServer.on('error', peerError);
app.use('/', peerServer);
app.enable('trust proxy');
app.get('/heapdump', dumps.sendHeapSnapshot);
app.get('/heapdump/save', dumps.saveHeapSnapshot);

if (process.env.uws !== "true") {
    var wsapp = express();
    wsapp.use(request_logger("[wsapp]"));
    wsapp.use('/assist', socket.wsRouter);

    const wsserver = wsapp.listen(PORT + 1, HOST, () => {
        console.log(`WS App listening on http://${HOST}:${PORT + 1}`);
        console.log('Press Ctrl+C to quit.');
    });
    wsapp.enable('trust proxy');
    socket.start(wsserver);
    module.exports = {wsserver, server};
} else {
    console.log("Using uWebSocket");
    const {App} = require("uWebSockets.js");
    const PREFIX = process.env.prefix || '/assist'

    const uapp = new App();

    const healthFn = (res, req) => {
        res.writeStatus('200 OK').end('ok!');
    }
    uapp.get(PREFIX, healthFn);
    uapp.get(`${PREFIX}/`, healthFn);


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

    uapp.listen(HOST, PORT + 1, (token) => {
        if (!token) {
            console.warn("port already in use");
        }
        console.log(`WS App listening on http://${HOST}:${PORT + 1}`);
        console.log('Press Ctrl+C to quit.');
    });


    process.on('uncaughtException', err => {
        console.log(`Uncaught Exception: ${err.message}`);
        debug && console.log(err.stack);
        // process.exit(1);
    });
    module.exports = {uapp, server};
}
console.log(`Heapdump enabled. Send a request to "/heapdump" to download a heapdump,\nor "/heapdump/save" to only generate a heapdump.`);