import APIClient from 'App/api_client';

const NO_NTH_FILE = "nnf"
const NO_UNPROCESSED_FILES = "nuf"

export async function* loadFiles(
  urls: string[],
){
  const firstFileURL = urls[0]
  urls = urls.slice(1)
  if (!firstFileURL) {
    throw "No urls provided"
  }
  try {
    yield await window.fetch(firstFileURL)
      .then(r => processAPIStreamResponse(r, true))
    for(const url in urls) {
      yield await window.fetch(url)
        .then(r =>  processAPIStreamResponse(r, false))
    }
  } catch(e) {
    if (e === NO_NTH_FILE) {
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
