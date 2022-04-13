'use strict';
const sourceMap = require('source-map');
const AWS = require('aws-sdk');
const sourceMapVersion = require('../package.json').dependencies["source-map"];
const URL = require('url');
const getVersion = version => version.replace(/[\^\$\=\~]/, "");

module.exports.sourcemapReader = async event => {
    sourceMap.SourceMapConsumer.initialize({
        "lib/mappings.wasm": `https://unpkg.com/source-map@${getVersion(sourceMapVersion)}/lib/mappings.wasm`
    });
    let s3;
    if (event.S3_HOST) {
        s3 = new AWS.S3({
            endpoint: event.S3_HOST,
            accessKeyId: event.S3_KEY,
            secretAccessKey: event.S3_SECRET,
            region: event.region,
            s3ForcePathStyle: true, // needed with minio?
            signatureVersion: 'v4'
        });
    } else if (process.env.S3_HOST) {
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
        s3.getObject(options, (err, data) => {
            if (err) {
                console.log("Get S3 object failed");
                console.log(err);
                return reject(err);
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
                                console.log("source not found, null preview for:");
                                console.log(original.source);
                                preview = []
                            }
                            url = URL.parse(original.source);
                        } else {
                            console.log("couldn't find original position of:");
                            console.log({
                                line: event.positions[i].line,
                                column: event.positions[i].column
                            });
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
                    // Use this code if you don't use the http event with the LAMBDA-PROXY integration
                    return resolve(results);
                })
                .finally(() => {
                    sourcemap = undefined;
                })

        });
    });
};