const connectedPeers = {};
const express = require('express');
const {ExpressPeerServer} = require('peer');
const app = express();

app.enable('trust proxy');
const HOST = '0.0.0.0';
const PORT = 9000;
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
const extractPeerId = (peerId) => {
    let splited = peerId.split("-");
    if (splited.length !== 2) {
        console.error(`cannot split peerId: ${client.id}`);
        return {};
    }
    return {projectKey: splited[0], sessionId: splited[1]};
};
peerServer.on('connection', (client) => {
    console.log(`initiating ${client.id}`);
    const {projectKey, sessionId} = extractPeerId(client.id);
    if (projectKey === undefined || sessionId === undefined) {
        return;
    }
    connectedPeers[projectKey] = connectedPeers[projectKey] || [];
    if (connectedPeers[projectKey].indexOf(sessionId) === -1) {
        console.log(`new connexion ${client.id}`);
        connectedPeers[projectKey].push(sessionId);
    } else {
        console.log(`reconnecting peer ${client.id}`);
    }


});
peerServer.on('disconnect', (client) => {
    console.log(`disconnect ${client.id}`);
    const {projectKey, sessionId} = extractPeerId(client.id);
    if (projectKey === undefined || sessionId === undefined) {
        return;
    }
    const i = (connectedPeers[projectKey] || []).indexOf(sessionId);
    if (i === -1) {
        console.log(`session not found ${client.id}`);
    } else {
        connectedPeers[projectKey].splice(i, 1);
    }
});
app.use('/', peerServer);


app.get('/peers', function (req, res) {
    console.log("looking for all available sessions");
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": connectedPeers}));
});
app.get('/peers/:projectKey', function (req, res) {
    console.log(`looking for available sessions for ${req.params.projectKey}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": connectedPeers[req.params.projectKey] || []}));
});


module.exports = app;