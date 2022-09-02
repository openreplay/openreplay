import APIClient from 'App/api_client';

const NO_NTH_FILE = "nnf"
const NO_UNPROCESSED_FILES = "nuf"

const getUnprocessedFileLink = (sessionId: string) => '/unprocessed/' + sessionId

type onDataCb = (data: Uint8Array) => void

export const loadFiles = (
  urls: string[],
  onData: onDataCb, 
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

export const checkUnprocessedMobs = async (sessionId: string) => {
  try {
    const api = new APIClient()
    const res = await api.fetch(getUnprocessedFileLink(sessionId))
    if (res.status >= 400) {
      throw NO_UNPROCESSED_FILES
    }
    const byteArray = await processAPIStreamResponse(res, false)
    return byteArray
  } catch (e) {
    throw e
  }
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
