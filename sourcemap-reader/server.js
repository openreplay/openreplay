const dumps = require('./utils/HeapSnapshot');
const sourcemapsReaderServer = require('./servers/sourcemaps-server');
const express = require('express');
const {request_logger} = require("./utils/helper");

const HOST = '0.0.0.0';
const PORT = 9000;

const app = express();
app.use(request_logger("[wsapp]"));

app.use('/sourcemaps', sourcemapsReaderServer);
app.use('/heapdump', dumps.router);

const server = app.listen(PORT, HOST, () => {
    console.log(`WS App listening on http://${HOST}:${PORT}`);
    console.log('Press Ctrl+C to quit.');
});
module.exports = {server};