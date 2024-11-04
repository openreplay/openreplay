const Minio = require('minio')
const { collectFilenames }  = require('./fs');
require('dotenv').config()

const PUBLIC_DIR = 'public';

var minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT,
    useSSL: process.env.MINIO_USE_SSL,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
});

collectFilenames(PUBLIC_DIR, n => !n.includes('.DS_Store')).forEach(name => {
	minioClient.fPutObject('frontend', name,`${PUBLIC_DIR}/${name}`, {}, function(err, etag) {
		if (err != null) {
			throw new Error(err);
		}
	})
});
