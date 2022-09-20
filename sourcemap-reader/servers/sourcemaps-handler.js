'use strict';
const fs = require('fs');
const sourceMap = require('source-map');
const AWS = require('aws-sdk');
const URL = require('url');
const wasm = fs.readFileSync(process.env.MAPPING_WASM || '/mappings.wasm');
sourceMap.SourceMapConsumer.initialize({
    "lib/mappings.wasm": wasm
});

console.log(`>sourceMap initialised using ${process.env.MAPPING_WASM || '/mappings.wasm'}`);

module.exports.sourcemapReader = async event => {
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

    var options = {
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
            const fileSize = (data.ContentLength / 1024) / 1024;
            options.fileSize = `${fileSize} Mb`;
            const downloadTime = (getObjectEnd - getObjectStart) / 1000;
            options.downloadTime = `${downloadTime} s`;
            if (fileSize >= 3) {
                console.log("[SR] large file:" + JSON.stringify(options));
            }
            let sourcemap = data.Body.toString();

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

                    const sourcemapProcessingTime = (Date.now() - getObjectEnd) / 1000;
                    options.sourcemapProcessingTime = `${sourcemapProcessingTime} s`
                    if (fileSize >= 3 || sourcemapProcessingTime > 2) {
                        console.log("[SR] " + JSON.stringify(options));
                    }
                    // Use this code if you don't use the http event with the LAMBDA-PROXY integration
                    return resolve(results);
                })
                .finally(() => {
                    sourcemap = undefined;
                })

        });
    });
};