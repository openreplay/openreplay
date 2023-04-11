import APIClient from 'App/api_client';

const ALLOWED_404 = "No-file-and-this-is-ok"
const NO_BACKUP_FILE = "No-efs-file"
export const NO_URLS = 'No-urls-provided'


export async function loadFiles(
  urls: string[],
  onData: (data: Uint8Array) => void,
): Promise<any> {
  if (!urls.length) {
    throw NO_URLS
  }
  try {
    for (let url of urls) {
      const response = await window.fetch(url)
      const data = await processAPIStreamResponse(response, url !== urls[0])
      onData(data)
    }
  } catch(e) {
    if (e === ALLOWED_404) {
      return
    }
    throw e
  }
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

const processAPIStreamResponse = (response: Response, skippable: boolean) => {
  return new Promise<ArrayBuffer>((res, rej) => {
    if (response.status === 404 && skippable) {
      return rej(ALLOWED_404)
    }
    if (response.status >= 400) {
      return rej(`Bad file status code ${response.status}. Url: ${response.url}`)
    }
    res(response.arrayBuffer())
  }).then(buffer => new Uint8Array(buffer))
}
