'use strict';
const fs = require('fs');
const sourceMap = require('source-map');
const {S3Client, GetObjectCommand} = require("@aws-sdk/client-s3");
const {BlobServiceClient, StorageSharedKeyCredential} = require("@azure/storage-blob");
const URL = require('url');
const http = require('http');
const https = require('https');
const dns = require('dns');
const net = require('net');
const wasm = fs.readFileSync(process.env.MAPPING_WASM || '/mappings.wasm');

const FETCH_TIMEOUT_MS = parseInt(process.env.SOURCEMAP_FETCH_TIMEOUT_MS) || 15000;
const MAX_SOURCEMAP_SIZE_BYTES = (parseInt(process.env.SOURCEMAP_MAX_SIZE_MB) || 100) * 1024 * 1024;

function isPublicIPv4(address) {
    const o = address.split('.').map(Number);
    if (o[0] === 0 || o[0] === 10 || o[0] === 127) return false;           // "this", private, loopback
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return false;           // CGNAT
    if (o[0] === 169 && o[1] === 254) return false;                        // link-local / cloud metadata
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return false;            // private
    if (o[0] === 192 && o[1] === 168) return false;                        // private
    if (o[0] === 192 && o[1] === 0 && (o[2] === 0 || o[2] === 2)) return false; // IETF, TEST-NET-1
    if (o[0] === 198 && (o[1] === 18 || o[1] === 19)) return false;        // benchmarking
    if (o[0] === 198 && o[1] === 51 && o[2] === 100) return false;         // TEST-NET-2
    if (o[0] === 203 && o[1] === 0 && o[2] === 113) return false;          // TEST-NET-3
    if (o[0] >= 224) return false;                                         // multicast, reserved, broadcast
    return true;
}

function isPublicIp(address) {
    if (net.isIPv4(address)) return isPublicIPv4(address);
    if (net.isIPv6(address)) {
        const ip = address.toLowerCase();
        if (ip.startsWith('::ffff:')) { // IPv4-mapped
            const rest = ip.slice(7);
            if (net.isIPv4(rest)) return isPublicIPv4(rest);
            const groups = rest.split(':');
            if (groups.length === 2) {
                const hi = parseInt(groups[0], 16), lo = parseInt(groups[1], 16);
                return isPublicIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
            }
            return false;
        }
        // only global unicast (2000::/3); rejects ::1, fe80::/10, fc00::/7, ff00::/8, NAT64...
        const firstGroup = parseInt(ip.split(':')[0] || '0', 16);
        return firstGroup >= 0x2000 && firstGroup <= 0x3fff;
    }
    return false;
}

// DNS lookup used for the actual connection: rejecting private ranges here
// (not only in the API's pre-check) closes the DNS-rebinding TOCTOU window.
function safeLookup(hostname, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    dns.lookup(hostname, {...options, all: true}, (err, addresses) => {
        if (err) return callback(err);
        if (!Array.isArray(addresses) || addresses.length === 0) {
            return callback(new Error('SSRF blocked: hostname did not resolve'));
        }
        for (const a of addresses) {
            if (!isPublicIp(a.address)) {
                return callback(new Error(`SSRF blocked: ${hostname} resolves to a non-public address`));
            }
        }
        if (options.all) {
            return callback(null, addresses);
        }
        return callback(null, addresses[0].address, addresses[0].family);
    });
}
sourceMap.SourceMapConsumer.initialize({
    "lib/mappings.wasm": wasm
});

console.log(`>sourceMap initialised using ${process.env.MAPPING_WASM || '/mappings.wasm'}`);

function parseSourcemap(sourcemap, event, options, resolve, reject) {
    const getObjectEnd = Date.now();
    try {
        return new sourceMap.SourceMapConsumer(sourcemap)
            .then(consumer => {
                let results = [];
                for (let i = 0; i < event.positions.length; i++) {
                    let original = consumer.originalPositionFor({
                        line: event.positions[i].line,
                        column: event.positions[i].column
                    });
                    let url = URL.parse("");
                    let preview = [];
                    if (original.source) {
                        preview = consumer.sourceContentFor(original.source, true);
                        if (preview !== null) {
                            preview = preview.split("\n")
                                .map((line, i) => [i + 1, line]);
                            if (event.padding) {
                                let start = original.line < event.padding ? 0 : original.line - event.padding;
                                preview = preview.slice(start, original.line + event.padding);
                            }
                        } else {
                            console.log(`[SR] source not found, null preview for: ${original.source}`);
                            preview = []
                        }
                        url = URL.parse(original.source);
                    } else {
                        console.log("[SR] couldn't find original position of: " + JSON.stringify({
                            line: event.positions[i].line,
                            column: event.positions[i].column
                        }));
                    }
                    let result = {
                        "absPath": url.href,
                        "filename": url.pathname,
                        "lineNo": original.line,
                        "colNo": original.column,
                        "function": original.name,
                        "context": preview
                    };
                    // console.log(result);
                    results.push(result);
                }
                consumer = undefined;

                options.sourcemapProcessingTime = (Date.now() - getObjectEnd) / 1000;
                options.sourcemapProcessingTimeUnit = 's';
                if (options.fileSize >= 3 || options.sourcemapProcessingTime > 2) {
                    console.log("[SR] " + JSON.stringify(options));
                }
                // Use this code if you don't use the http event with the LAMBDA-PROXY integration
                return resolve(results);
            })
            .catch(err => {
                return reject(err);
            })
            .finally(() => {
                sourcemap = undefined;
            });
    } catch (err) {
        reject(err);
    }
}

module.exports.sourcemapReader = async event => {
    if (event.isURL) {
        let parsedURL;
        try {
            parsedURL = new URL.URL(event.key);
        } catch (e) {
            return Promise.reject(new Error('SSRF blocked: invalid sourcemap URL'));
        }
        if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') {
            return Promise.reject(new Error(`SSRF blocked: unsupported protocol ${parsedURL.protocol}`));
        }
        if (parsedURL.username || parsedURL.password) {
            return Promise.reject(new Error('SSRF blocked: credentials in sourcemap URL'));
        }
        // node skips the lookup hook for IP literals, so check them here
        const literalHost = parsedURL.hostname.replace(/^\[|]$/g, '');
        if (net.isIP(literalHost) && !isPublicIp(literalHost)) {
            return Promise.reject(new Error('SSRF blocked: non-public IP address'));
        }
        const client = parsedURL.protocol === 'https:' ? https : http;
        let options = {
            URL: event.key
        };
        return new Promise(function (resolve, reject) {
            const getObjectStart = Date.now();
            const request = client.get(options.URL, {lookup: safeLookup, timeout: FETCH_TIMEOUT_MS}, (response) => {
                const {statusCode} = response;
                const contentType = response.headers['content-type'];

                let err;
                // Any 2xx status code signals a successful response but
                // here we're only checking for 200.
                if (statusCode !== 200) {
                    err = new Error('Request Failed.\n' +
                        `Status Code: ${statusCode}`);
                } else if (!/^application\/json/.test(contentType)) {
                    err = new Error('Invalid content-type.\n' +
                        `Expected application/json but received ${contentType}`);
                }
                if (err) {
                    // Consume response data to free up memory
                    response.resume();

                    console.error("[SR] Getting file from URL failed");
                    console.error("err:");
                    console.error(err.message);
                    console.error("response:");
                    return reject(err);
                }
                response.setEncoding('utf8');
                let rawData = '';
                let receivedBytes = 0;
                response.on('data', (chunk) => {
                    receivedBytes += Buffer.byteLength(chunk);
                    if (receivedBytes > MAX_SOURCEMAP_SIZE_BYTES) {
                        response.destroy();
                        return reject(new Error(`Sourcemap exceeds maximum allowed size of ${MAX_SOURCEMAP_SIZE_BYTES} bytes`));
                    }
                    rawData += chunk;
                });
                response.on('end', () => {
                    try {
                        const sourcemap = JSON.parse(rawData);
                        const getObjectEnd = Date.now();
                        options.fileSize = (response.headers['content-length'] / 1024) / 1024;
                        options.fileSizeUnit = 'Mb';
                        options.downloadTime = (getObjectEnd - getObjectStart) / 1000;
                        options.downloadTimeUnit = 's';
                        if (options.fileSize >= 3) {
                            console.log("[SR] large file:" + JSON.stringify(options));
                        }
                        return parseSourcemap(sourcemap, event, options, resolve, reject);
                    } catch (e) {
                        return reject(e);
                    }
                });

            });
            request.on('timeout', () => {
                request.destroy(new Error(`Timed out fetching sourcemap after ${FETCH_TIMEOUT_MS}ms`));
            });
            request.on('error', (e) => {
                return reject(e);
            });
        });
    } else {
        if (process.env.CLOUD === 'azure') {
            // Download the file from Azure Blob Storage
            const name = process.env.AZURE_ACCOUNT_NAME;
            const key = process.env.AZURE_ACCOUNT_KEY;
            const url = `https://${name}.blob.core.windows.net/`;

            return new Promise(async function (resolve, reject) {
                try {
                    // Init ABS client and get account info to check connection
                    let client = new BlobServiceClient(url, new StorageSharedKeyCredential(name, key));
                    await client.getAccountInfo();
                    let containerClient = client.getContainerClient(event.bucket);
                    const getObjectStart = Date.now();
                    const response = await containerClient.getBlobClient(event.key).downloadToBuffer();
                    const getObjectEnd = Date.now();

                    let options = {
                        Bucket: event.bucket,
                        Key: event.key,
                        fileSize: (response.length / 1024) / 1024,
                        fileSizeUnit: 'Mb',
                        downloadTime: (getObjectEnd - getObjectStart) / 1000,
                        downloadTimeUnit: 's',
                    };

                    if (options.fileSize >= 3) {
                        console.log("[SR] large file:" + JSON.stringify(options));
                    }
                    let sourcemap = response.toString();
                    return parseSourcemap(sourcemap, event, options, resolve, reject);
                } catch (err) {
                    if (err.statusCode && err.statusCode === 404) {
                        console.log("blob not found")
                    } else {
                        console.log("unknown error:", err);
                    }
                    return reject(err);
                }

            });
        } else {
            // Download the file from S3
            let s3;
            if (process.env.S3_HOST) {
                s3 = new S3Client({
                    endpoint: process.env.S3_HOST,
                    credentials: {
                        accessKeyId: process.env.S3_KEY,
                        secretAccessKey: process.env.S3_SECRET,
                    },
                    forcePathStyle: true, // needed with minio?
                });
            } else if (process.env.aws_access_key_id) {
                s3 = new S3Client({
                    credentials: {
                        accessKeyId: process.env.aws_access_key_id,
                        secretAccessKey: process.env.aws_secret_access_key,
                    },
                    region: process.env.aws_region,
                });
            } else if (process.env.aws_region) {
                s3 = new S3Client({
                    region: process.env.aws_region,
                });
            } else {
                s3 = new S3Client();
            }

            let options = {
                Bucket: event.bucket,
                Key: event.key
            };
            return new Promise(async function (resolve, reject) {
                const getObjectStart = Date.now();
                try {
                    const data = await s3.send(new GetObjectCommand(options));
                    const getObjectEnd = Date.now();
                    options.fileSize = (data.ContentLength / 1024) / 1024;
                    options.fileSizeUnit = 'Mb';
                    options.downloadTime = (getObjectEnd - getObjectStart) / 1000;
                    options.downloadTimeUnit = 's';
                    if (options.fileSize >= 3) {
                        console.log("[SR] large file:" + JSON.stringify(options));
                    }
                    let sourcemap = await data.Body.transformToString();
                    return parseSourcemap(sourcemap, event, options, resolve, reject);
                } catch (err) {
                    console.error("[SR] Get S3 object failed");
                    console.error(err);
                    return reject(err);
                }
            });
        }
    }
};