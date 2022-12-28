import APIClient from 'App/api_client';

const NO_NTH_FILE = "nnf"
const NO_UNPROCESSED_FILES = "nuf"

export const loadFiles = (
  urls: string[],
  onData: (data: Uint8Array) => void,
): Promise<void> => {
  const firstFileURL = urls[0]
  urls = urls.slice(1)
  if (!firstFileURL) {
    return Promise.reject("No urls provided")
  }
  return window.fetch(firstFileURL)
  .then(r => {
    return processAPIStreamResponse(r, true)
  })
  .then(onData)
  .then(() =>
    urls.reduce((p, url) =>
      p.then(() =>
        window.fetch(url)
        .then(r => {
          return processAPIStreamResponse(r, false)
        })
        .then(onData)
      ),
      Promise.resolve(),
    )
  )
  .catch(e => {
    if (e === NO_NTH_FILE) {
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
    throw NO_UNPROCESSED_FILES
  }
  return await processAPIStreamResponse(res, false)
}

const processAPIStreamResponse = (response: Response, isFirstFile: boolean) => {
  return new Promise<ArrayBuffer>((res, rej) => {
    if (response.status === 404 && !isFirstFile) {
      return rej(NO_NTH_FILE)
    }
    if (response.status >= 400) {
      return rej(
        isFirstFile ? `no start file. status code ${ response.status }`
        : `Bad endfile status code ${response.status}`
      )
    }
    res(response.arrayBuffer())
  }).then(buffer => new Uint8Array(buffer))
}
