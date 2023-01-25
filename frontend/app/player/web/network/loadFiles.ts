import APIClient from 'App/api_client';

export const NO_FILE_OK = "No-file-but-this-is-ok"
export const NO_SECOND_FILE = 'No-second-file-but-this-is-ok-too'
const NO_BACKUP_FILE = "No-efs-file"

async function loadFile(url: string, onData: (d: Uint8Array) => void, skippable: boolean) {
  try {
    const stream = await window.fetch(url)
    const data = await processAPIStreamResponse(stream, skippable)
    // Messages are being loaded and processed async, we can go on
    onData(data)

    return Promise.resolve('success')
  } catch (e) {
    throw e
  }
}

export const loadFiles = async (
  urls: string[],
  onData: (data: Uint8Array) => void,
): Promise<any> => {
  if (!urls.length) {
    return Promise.reject("No urls provided")
  }

  return Promise.allSettled(urls.map(url =>
    loadFile(url, onData, url === urls[0] && !url.match(/devtools/))
  )).then(results => {
    if (results[0].status === 'rejected') {
      // if no 1st file, we should fall back to EFS storage or display error
      return Promise.reject(results[0].reason)
    } else {
      // we don't care if second file is missing (expected)
      return Promise.resolve()
    }
  })
}

export async function requestEFSDom(sessionId: string) {
  return await requestEFSMobFile(sessionId + "/dom.mob")
}

export async function requestEFSDevtools(sessionId: string) {
  return await requestEFSMobFile(sessionId + "/devtools.mob")
}

async function requestEFSMobFile(filename: string) {
  const api = new APIClient()
  const res = await api.fetch('/unprocessed/' + filename)
  if (res.status >= 400) {
    throw NO_BACKUP_FILE
  }
  return await processAPIStreamResponse(res, false)
}

const processAPIStreamResponse = (response: Response, canBeMissed: boolean) => {
  return new Promise<ArrayBuffer>((res, rej) => {
    if (response.status === 404) {
      if (canBeMissed) return rej(NO_FILE_OK)
      else return rej(NO_SECOND_FILE);
    }
    if (response.status >= 400) {
      return rej(`Bad file status code ${response.status}. Url: ${response.url}`)
    }
    res(response.arrayBuffer())
  }).then(buffer => new Uint8Array(buffer))
}
