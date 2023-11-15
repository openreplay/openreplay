const express = require('express');
const HOST = process.env.LISTEN_HOST || '0.0.0.0';
const PORT = process.env.HEALTH_PORT || 8888;

const {request_logger} = require("./helper");
const debug = process.env.debug === "1";
const respond = function (res, data) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": data}));
}

const check_health = async function (req, res) {
    debug && console.log("[WS]looking for all available sessions");
    respond(res, {
        "health": true,
        "details": {
            "version": process.env.npm_package_version
        }
    });
}

const healthApp = express();
healthApp.use(express.json());
healthApp.use(express.urlencoded({extended: true}));
healthApp.use(request_logger("[healthApp]"));
healthApp.get(['/'], (req, res) => {
        res.statusCode = 200;
        res.end("healthApp ok!");
    }
);
healthApp.get('/health', check_health);
healthApp.get('/shutdown', (req, res) => {
        console.log("Requested shutdown");
        res.statusCode = 200;
        res.end("ok!");
        process.kill(1, "SIGTERM");
    }
);

const listen_cb = async function () {
    console.log(`Health App listening on http://${HOST}:${PORT}`);
    console.log('Press Ctrl+C to quit.');
}

module.exports = {
    healthApp,
    PORT,
    listen_cb
};
