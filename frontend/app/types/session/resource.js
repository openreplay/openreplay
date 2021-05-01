import { List } from 'immutable';
import Record from 'Types/Record';
import { getResourceName } from 'App/utils';
// import { List } from 'semantic-ui-react';

const XHR = 'xhr';
const JS = 'script';
const CSS = 'css';
const IMG = 'img';
const MEDIA = 'media';
const OTHER = 'other';
//
const FETCH = 'tracked_fetch';
// 
// const IMG_EXTENTIONS = [ "png", "gif", "jpg", "jpeg", "svg" ];
// const MEDIA_EXTENTIONS = [ 'mp4', 'mkv', 'ogg', 'webm', 'avi', 'mp3' ];
// 
// function getResourceType(type, initiator, url) {
//   if (type === 'xmlhttprequest') return XHR; // bad?
//   if (type !== undefined) return type;
//   if (initiator === 'xmlhttprequest' || initiator === 'fetch') return XHR;
//   if (initiator === 'img') return IMG;
//   const pathnameSplit = new URL(url).pathname.split('.');
//   if (pathnameSplit.length > 1) {
//     const extention = pathnameSplit.pop();
//     if (extention === 'css') return CSS;
//     if (extention === 'js') return JS;
//     if (IMG_EXTENTIONS.includes(extention)) return IMG
//     if (MEDIA_EXTENTIONS.includes(extention)) return MEDIA;
//   }
//   return OTHER;
// }

const TYPES_MAP = {
  "stylesheet": CSS,
  "fetch": XHR,
}

function getResourceStatus(status, success) {
  if (status !== undefined) return status;
  if (typeof success === 'boolean' || typeof success === 'number') {
    return !!success 
      ? '2xx-3xx'
      : '4xx-5xx';
  }
  return '2xx-3xx';
}

function getResourceSuccess(success, status) {
  if (success !== undefined) return !!success;
  if (status !== undefined) return status >= 200 && status < 300;
}

export const TYPES = {
  XHR,
  JS,
  CSS,
  IMG,
  MEDIA,
  OTHER,
  FETCH,
}

const YELLOW_BOUND = 10;
const RED_BOUND = 80;

export function isRed(r) {
  return !r.success || r.score >= RED_BOUND;
}
export function isYellow(r) {
  return r.score < RED_BOUND && r.score >= YELLOW_BOUND;
}

export default Record({
  type: OTHER,
  url: '',
  name: '',
  status: '2xx-3xx',
  duration: 0,
  index: undefined,
  time: undefined,  
  ttfb: 0,
  timewidth: 0,
  success: true,
  score: 0,
  // initiator: "other",
  // pagePath: "",
  method: '',
  payload:'',
  response: '',
  headerSize: 0,
  encodedBodySize: 0,
  decodedBodySize: 0,
  responseBodySize: 0,
  timings: List(),
}, {
  fromJS: ({ responseBody, response, type, initiator, status, success, time, datetime, timestamp, timings, ...resource }) => ({
    ...resource,
    type: TYPES_MAP[type] || type,
    name: getResourceName(resource.url),
    status: getResourceStatus(status, success),
    success: getResourceSuccess(success, status),
    time: typeof time === 'number' ? time : datetime || timestamp,    
    response: responseBody || response,
    ttfb: timings && timings.ttfb,
    timewidth: timings && timings.timewidth,
    timings,    
  }),
  name: 'Resource',
  methods: {
    isRed() {
      return isRed(this);
    },
    isYellow() {
      return isYellow(this);
    }
  }
});

