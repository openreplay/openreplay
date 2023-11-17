'use strict';
const fs = require('fs');
const sourceMap = require('source-map');
const AWS = require('aws-sdk');
const { BlobServiceClient, StorageSharedKeyCredential} = require("@azure/storage-blob");
const URL = require('url');
const http = require('http');
const wasm = fs.readFileSync(process.env.MAPPING_WASM || '/mappings.wasm');
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
        let options = {
            URL: event.key
        };
        return new Promise(function (resolve, reject) {
            const getObjectStart = Date.now();
            return http.get(options.URL, (response) => {
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
                response.on('data', (chunk) => {
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

            }).on('error', (e) => {
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
                        fileSize: (data.ContentLength / 1024) / 1024,
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
                s3 = new AWS.S3({
                    endpoint: process.env.S3_HOST,
                    accessKeyId: process.env.S3_KEY,
                    secretAccessKey: process.env.S3_SECRET,
                    s3ForcePathStyle: true, // needed with minio?
                    signatureVersion: 'v4'
                });
            } else {
                s3 = new AWS.S3({
                    'AccessKeyID': process.env.aws_access_key_id,
                    'SecretAccessKey': process.env.aws_secret_access_key,
                    'Region': process.env.aws_region
                });
            }

            let options = {
                Bucket: event.bucket,
                Key: event.key
            };
            return new Promise(function (resolve, reject) {
                const getObjectStart = Date.now();
                s3.getObject(options, (err, data) => {
                    if (err) {
                        console.error("[SR] Get S3 object failed");
                        console.error(err);
                        return reject(err);
                    }
                    const getObjectEnd = Date.now();
                    options.fileSize = (data.ContentLength / 1024) / 1024;
                    options.fileSizeUnit = 'Mb';
                    options.downloadTime = (getObjectEnd - getObjectStart) / 1000;
                    options.downloadTimeUnit = 's';
                    if (options.fileSize >= 3) {
                        console.log("[SR] large file:" + JSON.stringify(options));
                    }
                    let sourcemap = data.Body.toString();
                    return parseSourcemap(sourcemap, event, options, resolve, reject);
                });
            });
        }
    }
};