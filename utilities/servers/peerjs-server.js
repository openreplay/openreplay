var express = require('express');
var peerRouter = express.Router();

let PROJECT_KEY_LENGTH = parseInt(process.env.PROJECT_KEY_LENGTH) || 20;
let debug = process.env.debug === "1" || false;
const extractPeerId = (peerId) => {
    let splited = peerId.split("-");
    if (splited.length !== 2) {
        debug && console.error(`cannot split peerId: ${peerId}`);
        return {};
    }
    if (PROJECT_KEY_LENGTH > 0 && splited[0].length !== PROJECT_KEY_LENGTH) {
        debug && console.error(`wrong project key length for peerId: ${peerId}`);
        return {};
    }
    return {projectKey: splited[0], sessionId: splited[1]};
};
const connectedPeers = {};

const peerConnection = (client) => {
    debug && console.log(`initiating ${client.id}`);
    const {projectKey, sessionId} = extractPeerId(client.id);
    if (projectKey === undefined || sessionId === undefined) {
        return;
    }
    connectedPeers[projectKey] = connectedPeers[projectKey] || [];
    if (connectedPeers[projectKey].indexOf(sessionId) === -1) {
        debug && console.log(`new connexion ${client.id}`);
        connectedPeers[projectKey].push(sessionId);
    } else {
        debug && console.log(`reconnecting peer ${client.id}`);
    }


};
const peerDisconnect = (client) => {
    debug && console.log(`disconnect ${client.id}`);
    const {projectKey, sessionId} = extractPeerId(client.id);
    if (projectKey === undefined || sessionId === undefined) {
        return;
    }
    const i = (connectedPeers[projectKey] || []).indexOf(sessionId);
    if (i === -1) {
        debug && console.log(`session not found ${client.id}`);
    } else {
        connectedPeers[projectKey].splice(i, 1);
    }
}

const peerError = (error) => {
    console.error('error fired');
    console.error(error);
}


peerRouter.get(`/${process.env.S3_KEY}/peers`, function (req, res) {
    debug && console.log("looking for all available sessions");
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": connectedPeers}));
});
peerRouter.get(`/${process.env.S3_KEY}/peers/:projectKey`, function (req, res) {
    debug && console.log(`looking for available sessions for ${req.params.projectKey}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": connectedPeers[req.params.projectKey] || []}));
});


module.exports = {
    peerRouter,
    peerConnection,
    peerDisconnect,
    peerError,
    extractPeerId
};