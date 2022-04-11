const fs = require('fs');
const v8 = require('v8');

const location = '/tmp/';

async function createHeapSnapshot() {
    const fileName = `${Date.now()}.heapsnapshot`;
    await fs.promises.writeFile(
        location + fileName,
        v8.getHeapSnapshot()
    );
    return fileName;
}


async function sendHeapSnapshot(req, res) {
    const fileName = await createHeapSnapshot();
    res.download(location + fileName, function (err) {
        try {
            fs.unlinkSync(location + fileName)
        } catch (err) {
            console.error("error while deleting heapsnapshot file");
            console.error(err);
        }
    });
}

process.on('USR2', () => {
    console.info('USR2 signal received.');
});

async function saveHeapSnapshot(req, res) {
    const fileName = await createHeapSnapshot();
    const path = location + fileName;
    console.log(`Heapdump saved to ${path}`)
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({path}));
}

process.on('USR2', () => {
    console.info('USR2 signal received.');
});
module.exports = {sendHeapSnapshot, saveHeapSnapshot}