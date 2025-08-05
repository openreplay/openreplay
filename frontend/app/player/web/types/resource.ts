import type {
  ResourceTiming,
  NetworkRequest,
  Fetch,
  MobileNetworkCall,
} from '../messages';

export const enum ResourceType {
  XHR = 'xhr',
  FETCH = 'fetch',
  IOS = 'request',
  BEACON = 'beacon',
  SCRIPT = 'script',
  CSS = 'css',
  IMG = 'img',
  MEDIA = 'media',
  WS = 'websocket',
  GRAPHQL = 'graphql',
  OTHER = 'other',
}

export function getURLExtention(url: string): string {
  const pts = url.split('?')[0].split('.');
  return pts[pts.length - 1] || '';
}

// maybe move this thing to the tracker
export function getResourceType(initiator: string, url: string): ResourceType {
  switch (initiator) {
    case 'xmlhttprequest':
    case 'fetch':
      return ResourceType.FETCH;
    case 'beacon':
      return ResourceType.BEACON;
    case 'img':
      return ResourceType.IMG;
    default:
      switch (getURLExtention(url)) {
        case 'css':
          return ResourceType.CSS;
        case 'js':
          return ResourceType.SCRIPT;
        case 'png':
        case 'gif':
        case 'jpg':
        case 'jpeg':
        case 'svg':
          return ResourceType.IMG;
        case 'mp4':
        case 'mkv':
        case 'ogg':
        case 'webm':
        case 'avi':
        case 'mp3':
          return ResourceType.MEDIA;
        case 'graphql':
          return ResourceType.GRAPHQL;
        default:
          return ResourceType.OTHER;
      }
  }
}

export function getResourceName(url: string) {
  return url
    .split('/')
    .filter((s) => s !== '')
    .pop();
}

interface IResource {
  // index: number,
  time: number;
  type: ResourceType;
  url: string;
  status: string | number;
  method: string;
  duration: number;
  success: boolean;
  ttfb?: number;
  request?: string;
  response?: string;
  headerSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
  responseBodySize?: number;
  error?: string;
}

export interface IResourceTiming extends IResource {
  name: string;
  isRed: boolean;
  isYellow: boolean;
  type: ResourceType;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | '..';
  success: boolean;
  status: '2xx-3xx' | '4xx-5xx' | 'no-info';
  time: number;
}

export interface IResourceRequest extends IResource {
  name: string;
  isRed: boolean;
  isYellow: boolean;
  type: ResourceType.XHR | ResourceType.FETCH | ResourceType.IOS;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | '..';
  success: boolean;
  status: number;
  time: number;
  decodedBodySize?: number;
}

const getGraphqlReqName = (resource: IResource) => {
  try {
    if (!resource.request) return getResourceName(resource.url);
    const req = JSON.parse(resource.request);
    const body = JSON.parse(req.body);
    return /query (\w+)/.exec(body.query)?.[1];
  } catch (e) {
    return getResourceName(resource.url);
  }
};

export const Resource = (resource: IResource) => {
  const name =
    resource.type === 'graphql'
      ? getGraphqlReqName(resource)
      : getResourceName(resource.url);
  return {
    ...resource,
    name,
    isRed: !resource.success || resource.error, // || resource.score >= RED_BOUND,
    isYellow: false, // resource.score < RED_BOUND && resource.score >= YELLOW_BOUND,
  };
};

export function getResourceFromResourceTiming(
  msg: ResourceTiming,
  sessStart: number,
) {
  // duration might be duration=0 when cached
  const failed = msg.decodedBodySize === -111;
  const timingDataBlocked =
    msg.duration === 0 &&
    msg.ttfb === 0 &&
    msg.headerSize === 0 &&
    msg.encodedBodySize === 0 &&
    msg.transferredSize === 0;
  const type = getResourceType(msg.initiator, msg.url);
  let status;
  let success;
  if (timingDataBlocked) {
    status = 'no-info';
    // we don't know if it failed or not, so we assume success or cache
    success = true;
  } else {
    status = failed ? '4xx-5xx' : '2xx-3xx';
    success = !failed;
  }
  return Resource({
    ...msg,
    type,
    method: type === ResourceType.FETCH ? '..' : 'GET', // should be GET for all non-XHR/Fetch resources, right?
    success,
    status,
    time: Math.max(0, msg.timestamp - sessStart),
  });
}

export function getResourceFromNetworkRequest(
  msg: NetworkRequest | Fetch | MobileNetworkCall,
  sessStart: number,
) {
  return Resource({
    ...msg,
    // @ts-ignore
    type: msg?.type ? msg?.type : ResourceType.XHR,
    success: msg.status < 400,
    status: String(msg.status),
    time: Math.max(0, msg.timestamp - sessStart),
    decodedBodySize:
      'transferredBodySize' in msg ? msg.transferredBodySize : undefined,
  });
}
