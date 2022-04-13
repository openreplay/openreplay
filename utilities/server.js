const dumps = require('./utils/HeapSnapshot');
const express = require('express');
const socket = require("./servers/websocket");
const {request_logger} = require("./utils/helper");

const HOST = '0.0.0.0';
const PORT = 9001;

const wsapp = express();
wsapp.use(request_logger("[wsapp]"));

wsapp.use(`/assist/${process.env.S3_KEY}`, socket.wsRouter);
wsapp.use(`/heapdump/${process.env.S3_KEY}`, dumps.router);

const wsserver = wsapp.listen(PORT, HOST, () => {
    console.log(`WS App listening on http://${HOST}:${PORT}`);
    console.log('Press Ctrl+C to quit.');
});
wsapp.enable('trust proxy');
socket.start(wsserver);
module.exports = {wsserver};