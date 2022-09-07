const express = require('express');
const handler = require('./sourcemaps-handler');
const router = express.Router();

router.post('/', (req, res) => {
    let data = '';
    req.on('data', chunk => {
        data += chunk;
    });
    req.on('end', function () {
        data = JSON.parse(data);
        console.log("[SR] Starting parser for: " + data.key);
        // process.env = {...process.env, ...data.bucket_config};
        handler.sourcemapReader(data)
            .then((results) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(results));
            })
            .catch((e) => {
                console.error("[SR] Something went wrong");
                console.error(e);
                res.statusCode(500);
                res.end(e);
            });
    })

});

module.exports = router;