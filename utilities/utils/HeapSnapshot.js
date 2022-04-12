const fs = require('fs');
const v8 = require('v8');
const express = require('express');
const router = express.Router();

const location = '/tmp/';
let creationStatus = null;
let fileName = null;

async function createHeapSnapshot() {
    if (creationStatus) {
        return console.log(`In progress ${fileName}`);
    }
    if (fileName === null) {
        fileName = `${Date.now()}.heapsnapshot`;
    }
    console.log(`Creating ${fileName}`);
    await fs.promises.writeFile(
        location + fileName,
        v8.getHeapSnapshot()
    );
    console.log(`Created ${fileName}`);
    creationStatus = true;
}


async function downloadHeapSnapshot(req, res) {
    if (creationStatus === null) {
        return res.end("should call /new first");
    } else if (!creationStatus) {
        return res.end("should wait for done status");
    }
    res.download(location + fileName, function (err) {
        try {
            fs.unlinkSync(location + fileName)
        } catch (err) {
            console.error("error while deleting heapsnapshot file");
            console.error(err);
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

router.get(`/${process.env.S3_KEY}/status`, getHeapSnapshotStatus);
router.get(`/${process.env.S3_KEY}/new`, createNewHeapSnapshot);
router.get(`/${process.env.S3_KEY}/download`, downloadHeapSnapshot);
module.exports = {router}