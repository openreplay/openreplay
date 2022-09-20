const dumps = require('./utils/HeapSnapshot');
const sourcemapsReaderServer = require('./servers/sourcemaps-server');
const express = require('express');
const {request_logger} = require("./utils/helper");

const HOST = process.env.SMR_HOST || '127.0.0.1';
const PORT = process.env.SMR_PORT || 9000;
const PREFIX = process.env.PREFIX || process.env.prefix || ''
const P_KEY = process.env.SMR_KEY || 'smr';
const heapdump = process.env.heapdump === "1";

const app = express();
app.use(request_logger("[SR]"));
app.get(['/', PREFIX, `${PREFIX}/`, `${PREFIX}/${P_KEY}`, `${PREFIX}/${P_KEY}/`], (req, res) => {
        res.statusCode = 200;
        res.end("ok!");
    }
);
app.use(`${PREFIX}/${P_KEY}/sourcemaps`, sourcemapsReaderServer);
heapdump && app.use(`${PREFIX}/${P_KEY}/heapdump`, dumps.router);

const server = app.listen(PORT, HOST, () => {
    console.log(`SR App listening on http://${HOST}:${PORT}`);
    console.log('Press Ctrl+C to quit.');
});
module.exports = {server};