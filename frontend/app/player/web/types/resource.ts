import type { ResourceTiming, NetworkRequest, Fetch } from '../messages'

export const enum ResourceType {
  XHR = 'xhr',
  FETCH = 'fetch',
  SCRIPT = 'script',
  CSS = 'css',
  IMG = 'img',
  MEDIA = 'media',
  OTHER = 'other',
}

function getURLExtention(url: string): string {
  const pts = url.split("?")[0].split(".")
  return pts[pts.length-1] || ""
}

// maybe move this thing to the tracker
function getResourceType(initiator: string, url: string): ResourceType {
  switch (initiator) {
  case "xmlhttprequest":
  case "fetch":
      return ResourceType.FETCH
  case "img":
    return ResourceType.IMG
  default:
    switch (getURLExtention(url)) {
    case "css":
      return ResourceType.CSS
    case "js":
      return ResourceType.SCRIPT
    case "png":
    case "gif":
    case "jpg":
    case "jpeg":
    case "svg":
      return ResourceType.IMG
    case "mp4":
    case "mkv":
    case "ogg":
    case "webm":
    case "avi":
    case "mp3":
      return ResourceType.MEDIA
    default:
      return ResourceType.OTHER
    }
  }
}

function getResourceName(url: string) {
  return url
    .split('/')
    .filter((s) => s !== '')
    .pop();
}


const YELLOW_BOUND = 10;
const RED_BOUND = 80;


interface IResource {
  //index: number,
  time: number,
  type: ResourceType,
  url: string,
  status: string,
  method: string,
  duration: number,
  success: boolean,
  ttfb?: number,
  request?: string,
  response?: string,
  headerSize?: number,
  encodedBodySize?: number,
  decodedBodySize?: number,
  responseBodySize?: number,
}


export const Resource = (resource: IResource) => ({
  ...resource,
  name: getResourceName(resource.url),
  isRed: !resource.success, //|| resource.score >= RED_BOUND,
  isYellow: false, // resource.score < RED_BOUND && resource.score >= YELLOW_BOUND,
})


export function getResourceFromResourceTiming(msg: ResourceTiming, sessStart: number) {
  const success = msg.duration > 0 // might be duration=0 when cached
  const type = getResourceType(msg.initiator, msg.url)
  return Resource({
    ...msg,
    type,
    method: type === ResourceType.FETCH ? ".." : "GET", // should be GET for all non-XHR/Fetch resources, right?
    success,
    status: success ? '2xx-3xx' : '4xx-5xx', 
    time: Math.max(0, msg.timestamp - sessStart)
  })
}

export function getResourceFromNetworkRequest(msg: NetworkRequest | Fetch, sessStart: number) {
  return Resource({
    ...msg,
    // @ts-ignore
    type: msg?.type === "xhr" ? ResourceType.XHR : ResourceType.FETCH,
    success: msg.status < 400,
    status: String(msg.status),
    time: Math.max(0, msg.timestamp - sessStart),
  })
}


