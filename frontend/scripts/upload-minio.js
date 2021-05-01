const Minio = require('minio')
const { collectFilenames }  = require('./fs');

const PUBLIC_DIR = 'public';

var minioClient = new Minio.Client({
    endPoint: window.ENV.MINIO_ENDPOINT,
    port: window.ENV.MINIO_PORT,
    useSSL: window.ENV.MINIO_USE_SSL, //?
    accessKey: window.ENV.MINIO_ACCESS_KEY,
    secretKey: window.ENV.MINIO_SECRET_KEY,
});

collectFilenames(PUBLIC_DIR, n => !n.includes('.DS_Store')).forEach(name => {
	minioClient.fPutObject('frontend', name,`${PUBLIC_DIR}/${name}`, {}, function(err, etag) {
		if (err != null) {
			throw new Error(err);
		}
	})
});
