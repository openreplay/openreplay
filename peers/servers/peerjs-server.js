const express = require('express');
const peerRouter = express.Router();
const {extractPeerId} = require('../utils/helper');

let debug = process.env.debug === "1" || false;

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
    //https://peerjs.com/docs/#peeron-error
    console.error('Error detected in Peers');
    console.error('Error type:');
    console.error(error.type);
    console.error('Error message:');
    console.error(error);
}


peerRouter.get(`/peers`, function (req, res) {
    debug && console.log("looking for all available sessions");
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"data": connectedPeers}));
});
peerRouter.get(`/peers/:projectKey`, function (req, res) {
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