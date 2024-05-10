const fs = require('fs');
const v8 = require('v8');
const express = require('express');
const {logger} = require('./logger');

const router = express.Router();
const location = '/tmp/';
let creationStatus = null;
let fileName = null;

async function createHeapSnapshot() {
    if (creationStatus) {
        return logger.info(`In progress ${fileName}`);
    }
    if (fileName === null) {
        fileName = `${Date.now()}.heapsnapshot`;
    }
    console.log(`Creating ${fileName}`);
    await fs.promises.writeFile(
        location + fileName,
        v8.getHeapSnapshot()
    );
    logger.info(`Created ${fileName}`);
    creationStatus = true;
}


async function downloadHeapSnapshot(req, res) {
    if (creationStatus === null) {
        return res.end("should call /new first");
    } else if (!creationStatus) {
        return res.end("should wait for done status");
    }
    res.download(location + fileName, function (err) {
        if (err) {
            return logger.error("error while uploading HeapSnapshot file");
        }
        try {
            fs.unlinkSync(location + fileName)
        } catch (err) {
            logger.error(`error while deleting heap snapshot file, err: ${err}`);
        }
    });
}

function getHeapSnapshotStatus(req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({path: location + fileName, 'done': creationStatus}));
}

function createNewHeapSnapshot(req, res) {
    creationStatus = false;
    fileName = `${Date.now()}.heapsnapshot`;
    setTimeout(() => {
        createHeapSnapshot()
    }, 0);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({path: location + fileName, 'done': creationStatus}));
}

if (process.env.heapdump === "1") {
    router.get(`/status`, getHeapSnapshotStatus);
    router.get(`/new`, createNewHeapSnapshot);
    router.get(`/download`, downloadHeapSnapshot);
    logger.info(`HeapSnapshot enabled. Send a request to "/heapdump/new" to generate a heapdump.`);
}

module.exports = {router};
