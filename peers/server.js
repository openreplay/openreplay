const dumps = require('./utils/HeapSnapshot');
const {request_logger} = require('./utils/helper');
const assert = require('assert').strict;
const {peerRouter, peerConnection, peerDisconnect, peerError} = require('./servers/peerjs-server');
const express = require('express');
const {ExpressPeerServer} = require('peer');

const debug = process.env.debug === "1";
const heapdump = process.env.heapdump === "1";
const HOST = process.env.LISTEN_HOST || '0.0.0.0';
const PORT = process.env.LISTEN_PORT || 9000;
assert.ok(process.env.ASSIST_KEY, 'The "ASSIST_KEY" environment variable is required');
const P_KEY = process.env.ASSIST_KEY;

const app = express();

app.use(request_logger("[app]"));

app.use(`/${P_KEY}/assist`, peerRouter);
heapdump && app.use(`/${P_KEY}/heapdump`, dumps.router);

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
module.exports = {server};

process.on('uncaughtException', err => {
    console.log(`Uncaught Exception: ${err.message}`);
    debug && console.log(err.stack);
    // process.exit(1);
});