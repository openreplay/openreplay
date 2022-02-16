var sourcemapsReaderServer = require('./servers/sourcemaps-server');
var {peerRouter, peerConnection, peerDisconnect, peerError} = require('./servers/peerjs-server');
var express = require('express');
const {ExpressPeerServer} = require('peer');
const socket = require("./servers/websocket");

const HOST = '0.0.0.0';
const PORT = 9000;

var app = express();
var wsapp = express();
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
wsapp.use(request_logger("[wsapp]"));

app.use('/sourcemaps', sourcemapsReaderServer);
app.use('/assist', peerRouter);
wsapp.use('/assist', socket.wsRouter);

const server = app.listen(PORT, HOST, () => {
    console.log(`App listening on http://${HOST}:${PORT}`);
    console.log('Press Ctrl+C to quit.');
});
const wsserver = wsapp.listen(PORT + 1, HOST, () => {
    console.log(`WS App listening on http://${HOST}:${PORT + 1}`);
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
wsapp.enable('trust proxy');
socket.start(wsserver);
module.exports = {wsserver, server};
