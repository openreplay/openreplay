const https = require('https');

const getUploadURLs = (api_key, project_key, js_file_urls, server) =>
  new Promise((resolve, reject) => {
    if (js_file_urls.length === 0) {
      resolve([]);
    }

    let serverURL;
    try {
      serverURL = new URL(server);
    } catch (e) {
      return reject(`Failed to parse server URL "${server}".`);
    }

    const pathPrefix = (serverURL.pathname + '/').replace(/\/+/g, '/');
    const options = {
      method: 'PUT',
      hostname: serverURL.host,
      path: pathPrefix + `${project_key}/sourcemaps/`,
      headers: { Authorization: api_key, 'Content-Type': 'application/json' },
    };
    if (global._VERBOSE) {
      console.log('Request: ', options, '\nFiles: ', js_file_urls);
    }
    const req = https.request(options, (res) => {
      if (global._VERBOSE) {
        console.log(
          'Response Code: ',
          res.statusCode,
          '\nMessage: ',
          res.statusMessage,
        );
      }
      if (res.statusCode === 403) {
        reject(
          'Authorisation rejected. Please, check your API_KEY and/or PROJECT_KEY.',
        );
        return;
      } else if (res.statusCode !== 200) {
        reject('Server Error. Please, contact OpenReplay support.');
        return;
      }
      let data = '';
      res.on('data', (s) => (data += s));
      res.on('end', () => {
        if (global._VERBOSE) {
          console.log('Server Response: ', data);
        }
        resolve(JSON.parse(data).data);
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ URL: js_file_urls }));
    req.end();
  });

const uploadSourcemap = (upload_url, body) =>
  new Promise((resolve, reject) => {
    body = Buffer.from(JSON.stringify(body));
    const req = https.request(
      upload_url,
      {
        method: 'PUT',
        headers: {
          'Content-Length': body.length,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          if (global._VERBOSE) {
            console.log(
              'Response Code: ',
              res.statusCode,
              '\nMessage: ',
              res.statusMessage,
            );
          }

          reject('Unable to upload. Please, contact OpenReplay support.');
          return; // TODO: report per-file errors.
        }
        resolve();
        //res.on('end', resolve);
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });

module.exports = (api_key, project_key, sourcemaps, server) =>
  getUploadURLs(
    api_key,
    project_key,
    sourcemaps.map(({ js_file_url }) => js_file_url),
    server || 'https://api.openreplay.com',
  ).then((upload_urls) =>
    Promise.all(
      upload_urls.map((upload_url, i) =>
        uploadSourcemap(upload_url, sourcemaps[i].body).then(
          () => sourcemaps[i].js_file_url,
        ),
      ),
    ),
  );
