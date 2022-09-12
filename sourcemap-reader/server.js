const dumps = require('./utils/HeapSnapshot');
const sourcemapsReaderServer = require('./servers/sourcemaps-server');
const express = require('express');
const {request_logger} = require("./utils/helper");

const HOST = process.env.SR_HOST || '127.0.0.1';
const PORT = process.env.SR_PORT || 9000;

const app = express();
app.use(request_logger("[SR]"));

app.use('/sourcemaps', sourcemapsReaderServer);
app.use('/heapdump', dumps.router);

const server = app.listen(PORT, HOST, () => {
    console.log(`SR App listening on http://${HOST}:${PORT}`);
    console.log('Press Ctrl+C to quit.');
});
module.exports = {server};