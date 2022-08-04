import APIClient from 'App/api_client';

const NO_NTH_FILE = "nnf"

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
    console.log('wtf')
    throw e
  })
}

export const checkUnprocessedMobs = async (url: string, onData: onDataCb) => {
  try {
    const api = new APIClient()
    const res = await api.fetch(url)
    if (res.status >= 400) {
      return false
    }
    const byteArray = await processAPIStreamResponse(res, false)
    onData(byteArray)
    return true
  } catch (e) {
    console.error(e)
    return false
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
