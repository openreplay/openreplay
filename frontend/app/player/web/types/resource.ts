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
    .pop() as string;
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
  stalled?: number;
}

export interface IResourceTiming extends IResource {
  name: string;
  isRed: boolean;
  isYellow: boolean;
  type: ResourceType;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | '..';
  success: boolean;
  status: '2xx-3xx' | '4xx-5xx';
  time: number;
  timings: {
    queueing: number;
    dnsLookup: number;
    initialConnection: number;
    ssl: number;
    ttfb: number;
    contentDownload: number;
    stalled: number;
    total: number;
  };
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

const getGraphqlReqName = (
  resource: Partial<IResourceRequest | IResourceTiming>,
) => {
  try {
    if (!resource.request) return getResourceName(resource.url ?? '');
    const req = JSON.parse(resource.request);
    const body = JSON.parse(req.body);
    return /query (\w+)/.exec(body.query)?.[1] as string;
  } catch (e) {
    return getResourceName(resource.url ?? '');
  }
};

export const Resource = (
  resource: Partial<IResourceRequest | IResourceTiming>,
) => {
  const name =
    resource.type === 'graphql'
      ? getGraphqlReqName(resource)
      : getResourceName(resource.url ?? '');

  return {
    ...resource,
    name,
    isRed: Boolean(!resource.success || resource.error), // || resource.score >= RED_BOUND,
    isYellow: false, // resource.score < RED_BOUND && resource.score >= YELLOW_BOUND,
  };
};

export function getResourceFromResourceTiming(
  msg: ResourceTiming,
  sessStart: number,
) {
  // duration might be duration=0 when cached
  const failed =
    msg.duration === 0 &&
    msg.ttfb === 0 &&
    msg.headerSize === 0 &&
    msg.encodedBodySize === 0 &&
    msg.transferredSize === 0;
  const type = getResourceType(msg.initiator, msg.url);
  return Resource({
    ...msg,
    type,
    method: type === ResourceType.FETCH ? '..' : 'GET', // should be GET for all non-XHR/Fetch resources, right?
    success: !failed,
    status: !failed ? '2xx-3xx' : '4xx-5xx',
    time: Math.max(0, msg.timestamp - sessStart),
    timings: {
      queueing: msg.queueing,
      dnsLookup: msg.dnsLookup,
      initialConnection: msg.initialConnection,
      ssl: msg.ssl,
      ttfb: msg.ttfb,
      contentDownload: msg.contentDownload,
      total: msg.total,
      stalled: msg.stalled,
    },
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
    timings: {},
  });
}
