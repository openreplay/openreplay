const dumps = require('./utils/HeapSnapshot');
const express = require('express');
const socket = require("./servers/websocket");
const {request_logger} = require("./utils/helper");
const health = require("./utils/health");
const assert = require('assert').strict
const register = require('./utils/metrics').register;

health.healthApp.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
});

const debug = process.env.debug === "1";
const heapdump = process.env.heapdump === "1";
const HOST = process.env.LISTEN_HOST || '0.0.0.0';
const PORT = process.env.LISTEN_PORT || 9001;
assert.ok(process.env.ASSIST_KEY, 'The "ASSIST_KEY" environment variable is required');
const P_KEY = process.env.ASSIST_KEY;
const PREFIX = process.env.PREFIX || process.env.prefix || `/assist`;

const wsapp = express();
wsapp.use(express.json());
wsapp.use(express.urlencoded({extended: true}));
wsapp.use(request_logger("[wsapp]"));

wsapp.get(['/', PREFIX, `${PREFIX}/`, `${PREFIX}/${P_KEY}`, `${PREFIX}/${P_KEY}/`], (req, res) => {
        res.statusCode = 200;
        res.end("ok!");
    }
);
wsapp.use(`${PREFIX}/${P_KEY}`, socket.wsRouter);
heapdump && wsapp.use(`${PREFIX}/${P_KEY}/heapdump`, dumps.router);

const wsserver = wsapp.listen(PORT, HOST, () => {
    console.log(`WS App listening on http://${HOST}:${PORT}`);
    health.healthApp.listen(health.PORT, HOST, health.listen_cb);
});

wsapp.enable('trust proxy');
socket.start(wsserver);
module.exports = {wsserver};
