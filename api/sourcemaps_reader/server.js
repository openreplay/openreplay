const http = require('http');
const handler = require('./handler');
const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
        let data = '';
        req.on('data', chunk => {
            data += chunk;
        });
        req.on('end', function () {
            data = JSON.parse(data);
            console.log("Starting parser for: " + data.key);
            process.env = {...process.env, ...data.bucket_config};
            handler.sourcemapReader(data)
                .then((results) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(results));
                })
                .catch((e) => {
                    console.error("Something went wrong");
                    console.error(e);
                    res.statusCode(500);
                    res.end(e);
                });
        })
    } else {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Method Not Allowed');
    }
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});