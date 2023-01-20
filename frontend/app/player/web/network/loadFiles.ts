import APIClient from 'App/api_client';

const NO_FILE_OK = "No-file-but-this-is-ok"
const NO_BACKUP_FILE = "No-efs-file"

export const loadFiles = (
  urls: string[],
  onData: (data: Uint8Array) => void,
): Promise<void> => {
  if (!urls.length) {
    return Promise.reject("No urls provided")
  }
  return urls.reduce((p, url, index) =>
    p.then(() =>
      window.fetch(url)
      .then(r => {
        return processAPIStreamResponse(r, index===0)
      })
      .then(onData)
    ),
    Promise.resolve(),
  )
  .catch(e => {
    if (e === NO_FILE_OK) {
      return
    }
    throw e
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
    if (response.status === 404 && canBeMissed) {
      return rej(NO_FILE_OK)
    }
    if (response.status >= 400) {
      return rej(`Bad file status code ${response.status}. Url: ${response.url}`)
    }
    res(response.arrayBuffer())
  }).then(buffer => new Uint8Array(buffer))
}
