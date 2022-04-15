const dumps = require('./utils/HeapSnapshot');
const {request_logger} = require('./utils/helper');
const {peerRouter, peerConnection, peerDisconnect, peerError} = require('./servers/peerjs-server');
const express = require('express');
const {ExpressPeerServer} = require('peer');

const HOST = '0.0.0.0';
const PORT = 9000;

const app = express();

app.use(request_logger("[app]"));

app.use(`/${process.env.S3_KEY}/assist`, peerRouter);
app.use(`/${process.env.S3_KEY}/heapdump`, dumps.router);

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