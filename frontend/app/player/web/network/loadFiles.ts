import APIClient from 'App/api_client';

export const NO_FILE_OK = "No-file-but-this-is-ok"
const NO_BACKUP_FILE = "No-efs-file"

export const loadFiles = async (
  urls: string[],
  onData: (data: Uint8Array) => void,
): Promise<void> => {
  if (!urls.length) {
    return Promise.reject("No urls provided")
  }
  for (let url of urls) {
    const stream = await window.fetch(url)
    const data = await processAPIStreamResponse(stream, url === urls[0])
    onData(data)
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

const processAPIStreamResponse = (response: Response, canBeMissed: boolean) => {
  return new Promise<ArrayBuffer>((res, rej) => {
    if (response.status === 404) {
      if (canBeMissed) return rej(NO_FILE_OK)
        // ignoring if 2nd mob file is missing
      else return;
    }
    if (response.status >= 400) {
      return rej(`Bad file status code ${response.status}. Url: ${response.url}`)
    }
    res(response.arrayBuffer())
  }).then(buffer => new Uint8Array(buffer))
}
