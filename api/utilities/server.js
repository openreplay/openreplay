var sourcemapsReaderServer = require('./servers/sourcemaps-server');
var {peerRouter, peerConnection, peerDisconnect} = require('./servers/peerjs-server');
var express = require('express');
const {ExpressPeerServer} = require('peer');

const HOST = '0.0.0.0';
const PORT = 9000;


var app = express();
app.use((req, res, next) => {
    console.log(new Date().toTimeString(), req.method, req.originalUrl);
    next();
});

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
    allow_discovery: true
});
peerServer.on('connection', peerConnection);
peerServer.on('disconnect', peerDisconnect);
app.use('/', peerServer);
app.enable('trust proxy');
module.exports = server;
