'use strict';
const sourceMap = require('source-map');
const AWS = require('aws-sdk');
const sourceMapVersion = require('./package.json').dependencies["source-map"];
const URL = require('url');
const getVersion = version => version.replace(/[\^\$\=\~]/, "");

module.exports.sourcemapReader = async event => {
    sourceMap.SourceMapConsumer.initialize({
        "lib/mappings.wasm": `https://unpkg.com/source-map@${getVersion(sourceMapVersion)}/lib/mappings.wasm`
    });
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
        s3.getObject(options, (err, data) => {
            if (err) {
                console.log("Get S3 object failed");
                console.log(err);
                return reject(err);
            }
            const sourcemap = data.Body.toString();

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

                    // Use this code if you don't use the http event with the LAMBDA-PROXY integration
                    return resolve(results);
                });
        });
    });
};


// let v = {
//     'key': '1725/99f96f044fa7e941dbb15d7d68b20549',
//     'positions': [{'line': 1, 'column': 943}],
//     'padding': 5,
//     'bucket': 'asayer-sourcemaps'
// };
// let v = {
//     'key': '1/65d8d3866bb8c92f3db612cb330f270c',
//     'positions': [{'line': 1, 'column': 0}],
//     'padding': 5,
//     'bucket': 'asayer-sourcemaps-staging'
// };
// module.exports.sourcemapReader(v).then((r) => {
//     // console.log(r);
//     const fs = require('fs');
//     let data = JSON.stringify(r);
//     fs.writeFileSync('results.json', data);
// });