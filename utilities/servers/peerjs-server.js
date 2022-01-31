var express = require('express');
var peerRouter = express.Router();


const extractPeerId = (peerId) => {
    let splited = peerId.split("-");
    if (splited.length !== 2) {
        console.error(`cannot split peerId: ${peerId}`);
        return {};
    }
    return {projectKey: splited[0], sessionId: splited[1]};
};
const connectedPeers = {};

const peerConnection = (client) => {
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


};
const peerDisconnect = (client) => {
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
}

const peerError = (error) => {
    console.error('error fired');
    console.error(error);
}


peerRouter.get(`/${process.env.S3_KEY}/peers`, function (req, res) {
    console.log("looking for all available sessions");
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": connectedPeers}));
});
peerRouter.get(`/${process.env.S3_KEY}/peers/:projectKey`, function (req, res) {
    console.log(`looking for available sessions for ${req.params.projectKey}`);
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