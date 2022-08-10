const NO_NTH_FILE = "nnf"

export default function load(
  urls: string[],
  onData: (ba: Uint8Array) => void, 
): Promise<void> {
  const firstFileURL = urls[0]
  urls = urls.slice(1)
  if (!firstFileURL) {
    return Promise.reject("No urls provided")
  }
  return window.fetch(firstFileURL)
  .then(r => {
    if (r.status >= 400) {
      throw new Error(`no start file. status code ${ r.status }`)
    }
    return r.arrayBuffer()
  })
  .then(b => new Uint8Array(b))
  .then(onData)
  .then(() => 
    urls.reduce((p, url) => 
      p.then(() =>
        window.fetch(url)
        .then(r => {
          return new Promise<ArrayBuffer>((res, rej) => {
            if (r.status == 404) {
              rej(NO_NTH_FILE)
              return
            }
            if (r.status >= 400) {
              rej(`Bad endfile status code ${r.status}`)
              return
            }
            res(r.arrayBuffer())
          })
        })
        .then(b => new Uint8Array(b))
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
