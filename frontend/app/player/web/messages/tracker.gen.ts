// Auto-generated, do not edit
/* eslint-disable */

import type { RawMessage } from './raw.gen'
import { MType } from './raw.gen'


type TrTimestamp = [
  type: 0,
  timestamp: number,
]

type TrSetPageLocation = [
  type: 4,
  url: string,
  referrer: string,
  navigationStart: number,
]

type TrSetViewportSize = [
  type: 5,
  width: number,
  height: number,
]

type TrSetViewportScroll = [
  type: 6,
  x: number,
  y: number,
]

type TrCreateDocument = [
  type: 7,
  
]

type TrCreateElementNode = [
  type: 8,
  id: number,
  parentID: number,
  index: number,
  tag: string,
  svg: boolean,
]

type TrCreateTextNode = [
  type: 9,
  id: number,
  parentID: number,
  index: number,
]

type TrMoveNode = [
  type: 10,
  id: number,
  parentID: number,
  index: number,
]

type TrRemoveNode = [
  type: 11,
  id: number,
]

type TrSetNodeAttribute = [
  type: 12,
  id: number,
  name: string,
  value: string,
]

type TrRemoveNodeAttribute = [
  type: 13,
  id: number,
  name: string,
]

type TrSetNodeData = [
  type: 14,
  id: number,
  data: string,
]

type TrSetNodeScroll = [
  type: 16,
  id: number,
  x: number,
  y: number,
]

type TrSetInputTarget = [
  type: 17,
  id: number,
  label: string,
]

type TrSetInputValue = [
  type: 18,
  id: number,
  value: string,
  mask: number,
]

type TrSetInputChecked = [
  type: 19,
  id: number,
  checked: boolean,
]

type TrMouseMove = [
  type: 20,
  x: number,
  y: number,
]

type TrNetworkRequestDeprecated = [
  type: 21,
  type: string,
  method: string,
  url: string,
  request: string,
  response: string,
  status: number,
  timestamp: number,
  duration: number,
]

type TrConsoleLog = [
  type: 22,
  level: string,
  value: string,
]

type TrPageLoadTiming = [
  type: 23,
  requestStart: number,
  responseStart: number,
  responseEnd: number,
  domContentLoadedEventStart: number,
  domContentLoadedEventEnd: number,
  loadEventStart: number,
  loadEventEnd: number,
  firstPaint: number,
  firstContentfulPaint: number,
]

type TrPageRenderTiming = [
  type: 24,
  speedIndex: number,
  visuallyComplete: number,
  timeToInteractive: number,
]

type TrCustomEvent = [
  type: 27,
  name: string,
  payload: string,
]

type TrUserID = [
  type: 28,
  id: string,
]

type TrUserAnonymousID = [
  type: 29,
  id: string,
]

type TrMetadata = [
  type: 30,
  key: string,
  value: string,
]

type TrCSSInsertRule = [
  type: 37,
  id: number,
  rule: string,
  index: number,
]

type TrCSSDeleteRule = [
  type: 38,
  id: number,
  index: number,
]

type TrFetch = [
  type: 39,
  method: string,
  url: string,
  request: string,
  response: string,
  status: number,
  timestamp: number,
  duration: number,
]

type TrProfiler = [
  type: 40,
  name: string,
  duration: number,
  args: string,
  result: string,
]

type TrOTable = [
  type: 41,
  key: string,
  value: string,
]

type TrStateAction = [
  type: 42,
  type: string,
]

type TrRedux = [
  type: 44,
  action: string,
  state: string,
  duration: number,
]

type TrVuex = [
  type: 45,
  mutation: string,
  state: string,
]

type TrMobX = [
  type: 46,
  type: string,
  payload: string,
]

type TrNgRx = [
  type: 47,
  action: string,
  state: string,
  duration: number,
]

type TrGraphQL = [
  type: 48,
  operationKind: string,
  operationName: string,
  variables: string,
  response: string,
]

type TrPerformanceTrack = [
  type: 49,
  frames: number,
  ticks: number,
  totalJSHeapSize: number,
  usedJSHeapSize: number,
]

type TrStringDict = [
  type: 50,
  key: number,
  value: string,
]

type TrSetNodeAttributeDict = [
  type: 51,
  id: number,
  nameKey: number,
  valueKey: number,
]

type TrResourceTimingDeprecated = [
  type: 53,
  timestamp: number,
  duration: number,
  ttfb: number,
  headerSize: number,
  encodedBodySize: number,
  decodedBodySize: number,
  url: string,
  initiator: string,
]

type TrConnectionInformation = [
  type: 54,
  downlink: number,
  type: string,
]

type TrSetPageVisibility = [
  type: 55,
  hidden: boolean,
]

type TrLoadFontFace = [
  type: 57,
  parentID: number,
  family: string,
  source: string,
  descriptors: string,
]

type TrSetNodeFocus = [
  type: 58,
  id: number,
]

type TrLongTask = [
  type: 59,
  timestamp: number,
  duration: number,
  context: number,
  containerType: number,
  containerSrc: string,
  containerId: string,
  containerName: string,
]

type TrSetNodeAttributeURLBased = [
  type: 60,
  id: number,
  name: string,
  value: string,
  baseURL: string,
]

type TrSetCSSDataURLBased = [
  type: 61,
  id: number,
  data: string,
  baseURL: string,
]

type TrTechnicalInfo = [
  type: 63,
  type: string,
  value: string,
]

type TrCustomIssue = [
  type: 64,
  name: string,
  payload: string,
]

type TrCSSInsertRuleURLBased = [
  type: 67,
  id: number,
  rule: string,
  index: number,
  baseURL: string,
]

type TrMouseClick = [
  type: 69,
  id: number,
  hesitationTime: number,
  label: string,
  selector: string,
]

type TrCreateIFrameDocument = [
  type: 70,
  frameID: number,
  id: number,
]

type TrAdoptedSSReplaceURLBased = [
  type: 71,
  sheetID: number,
  text: string,
  baseURL: string,
]

type TrAdoptedSSInsertRuleURLBased = [
  type: 73,
  sheetID: number,
  rule: string,
  index: number,
  baseURL: string,
]

type TrAdoptedSSDeleteRule = [
  type: 75,
  sheetID: number,
  index: number,
]

type TrAdoptedSSAddOwner = [
  type: 76,
  sheetID: number,
  id: number,
]

type TrAdoptedSSRemoveOwner = [
  type: 77,
  sheetID: number,
  id: number,
]

type TrJSException = [
  type: 78,
  name: string,
  message: string,
  payload: string,
  metadata: string,
]

type TrZustand = [
  type: 79,
  mutation: string,
  state: string,
]

type TrBatchMetadata = [
  type: 81,
  version: number,
  pageNo: number,
  firstIndex: number,
  timestamp: number,
  location: string,
]

type TrPartitionedMessage = [
  type: 82,
  partNo: number,
  partTotal: number,
]

type TrNetworkRequest = [
  type: 83,
  type: string,
  method: string,
  url: string,
  request: string,
  response: string,
  status: number,
  timestamp: number,
  duration: number,
  transferredBodySize: number,
]

type TrWSChannel = [
  type: 84,
  chType: string,
  channelName: string,
  data: string,
  timestamp: number,
  dir: string,
  messageType: string,
]

type TrInputChange = [
  type: 112,
  id: number,
  value: string,
  valueMasked: boolean,
  label: string,
  hesitationTime: number,
  inputDuration: number,
]

type TrSelectionChange = [
  type: 113,
  selectionStart: number,
  selectionEnd: number,
  selection: string,
]

type TrMouseThrashing = [
  type: 114,
  timestamp: number,
]

type TrUnbindNodes = [
  type: 115,
  totalRemovedPercent: number,
]

type TrResourceTiming = [
  type: 116,
  timestamp: number,
  duration: number,
  ttfb: number,
  headerSize: number,
  encodedBodySize: number,
  decodedBodySize: number,
  url: string,
  initiator: string,
  transferredSize: number,
  cached: boolean,
]

type TrTabChange = [
  type: 117,
  tabId: string,
]

type TrTabData = [
  type: 118,
  tabId: string,
]

type TrCanvasNode = [
  type: 119,
  nodeId: string,
  timestamp: number,
]

type TrTagTrigger = [
  type: 120,
  tagId: number,
]


export type TrackerMessage = TrTimestamp | TrSetPageLocation | TrSetViewportSize | TrSetViewportScroll | TrCreateDocument | TrCreateElementNode | TrCreateTextNode | TrMoveNode | TrRemoveNode | TrSetNodeAttribute | TrRemoveNodeAttribute | TrSetNodeData | TrSetNodeScroll | TrSetInputTarget | TrSetInputValue | TrSetInputChecked | TrMouseMove | TrNetworkRequestDeprecated | TrConsoleLog | TrPageLoadTiming | TrPageRenderTiming | TrCustomEvent | TrUserID | TrUserAnonymousID | TrMetadata | TrCSSInsertRule | TrCSSDeleteRule | TrFetch | TrProfiler | TrOTable | TrStateAction | TrRedux | TrVuex | TrMobX | TrNgRx | TrGraphQL | TrPerformanceTrack | TrStringDict | TrSetNodeAttributeDict | TrResourceTimingDeprecated | TrConnectionInformation | TrSetPageVisibility | TrLoadFontFace | TrSetNodeFocus | TrLongTask | TrSetNodeAttributeURLBased | TrSetCSSDataURLBased | TrTechnicalInfo | TrCustomIssue | TrCSSInsertRuleURLBased | TrMouseClick | TrCreateIFrameDocument | TrAdoptedSSReplaceURLBased | TrAdoptedSSInsertRuleURLBased | TrAdoptedSSDeleteRule | TrAdoptedSSAddOwner | TrAdoptedSSRemoveOwner | TrJSException | TrZustand | TrBatchMetadata | TrPartitionedMessage | TrNetworkRequest | TrWSChannel | TrInputChange | TrSelectionChange | TrMouseThrashing | TrUnbindNodes | TrResourceTiming | TrTabChange | TrTabData | TrCanvasNode | TrTagTrigger

export default function translate(tMsg: TrackerMessage): RawMessage | null {
  switch(tMsg[0]) {
    
    case 0: {
      return {
        tp: MType.Timestamp,
        timestamp: tMsg[1],
      }
    }
    
    case 4: {
      return {
        tp: MType.SetPageLocation,
        url: tMsg[1],
        referrer: tMsg[2],
        navigationStart: tMsg[3],
      }
    }
    
    case 5: {
      return {
        tp: MType.SetViewportSize,
        width: tMsg[1],
        height: tMsg[2],
      }
    }
    
    case 6: {
      return {
        tp: MType.SetViewportScroll,
        x: tMsg[1],
        y: tMsg[2],
      }
    }
    
    case 7: {
      return {
        tp: MType.CreateDocument,
        
      }
    }
    
    case 8: {
      return {
        tp: MType.CreateElementNode,
        id: tMsg[1],
        parentID: tMsg[2],
        index: tMsg[3],
        tag: tMsg[4],
        svg: tMsg[5],
      }
    }
    
    case 9: {
      return {
        tp: MType.CreateTextNode,
        id: tMsg[1],
        parentID: tMsg[2],
        index: tMsg[3],
      }
    }
    
    case 10: {
      return {
        tp: MType.MoveNode,
        id: tMsg[1],
        parentID: tMsg[2],
        index: tMsg[3],
      }
    }
    
    case 11: {
      return {
        tp: MType.RemoveNode,
        id: tMsg[1],
      }
    }
    
    case 12: {
      return {
        tp: MType.SetNodeAttribute,
        id: tMsg[1],
        name: tMsg[2],
        value: tMsg[3],
      }
    }
    
    case 13: {
      return {
        tp: MType.RemoveNodeAttribute,
        id: tMsg[1],
        name: tMsg[2],
      }
    }
    
    case 14: {
      return {
        tp: MType.SetNodeData,
        id: tMsg[1],
        data: tMsg[2],
      }
    }
    
    case 16: {
      return {
        tp: MType.SetNodeScroll,
        id: tMsg[1],
        x: tMsg[2],
        y: tMsg[3],
      }
    }
    
    case 18: {
      return {
        tp: MType.SetInputValue,
        id: tMsg[1],
        value: tMsg[2],
        mask: tMsg[3],
      }
    }
    
    case 19: {
      return {
        tp: MType.SetInputChecked,
        id: tMsg[1],
        checked: tMsg[2],
      }
    }
    
    case 20: {
      return {
        tp: MType.MouseMove,
        x: tMsg[1],
        y: tMsg[2],
      }
    }
    
    case 21: {
      return {
        tp: MType.NetworkRequestDeprecated,
        type: tMsg[1],
        method: tMsg[2],
        url: tMsg[3],
        request: tMsg[4],
        response: tMsg[5],
        status: tMsg[6],
        timestamp: tMsg[7],
        duration: tMsg[8],
      }
    }
    
    case 22: {
      return {
        tp: MType.ConsoleLog,
        level: tMsg[1],
        value: tMsg[2],
      }
    }
    
    case 37: {
      return {
        tp: MType.CssInsertRule,
        id: tMsg[1],
        rule: tMsg[2],
        index: tMsg[3],
      }
    }
    
    case 38: {
      return {
        tp: MType.CssDeleteRule,
        id: tMsg[1],
        index: tMsg[2],
      }
    }
    
    case 39: {
      return {
        tp: MType.Fetch,
        method: tMsg[1],
        url: tMsg[2],
        request: tMsg[3],
        response: tMsg[4],
        status: tMsg[5],
        timestamp: tMsg[6],
        duration: tMsg[7],
      }
    }
    
    case 40: {
      return {
        tp: MType.Profiler,
        name: tMsg[1],
        duration: tMsg[2],
        args: tMsg[3],
        result: tMsg[4],
      }
    }
    
    case 41: {
      return {
        tp: MType.OTable,
        key: tMsg[1],
        value: tMsg[2],
      }
    }
    
    case 44: {
      return {
        tp: MType.Redux,
        action: tMsg[1],
        state: tMsg[2],
        duration: tMsg[3],
      }
    }
    
    case 45: {
      return {
        tp: MType.Vuex,
        mutation: tMsg[1],
        state: tMsg[2],
      }
    }
    
    case 46: {
      return {
        tp: MType.MobX,
        type: tMsg[1],
        payload: tMsg[2],
      }
    }
    
    case 47: {
      return {
        tp: MType.NgRx,
        action: tMsg[1],
        state: tMsg[2],
        duration: tMsg[3],
      }
    }
    
    case 48: {
      return {
        tp: MType.GraphQl,
        operationKind: tMsg[1],
        operationName: tMsg[2],
        variables: tMsg[3],
        response: tMsg[4],
      }
    }
    
    case 49: {
      return {
        tp: MType.PerformanceTrack,
        frames: tMsg[1],
        ticks: tMsg[2],
        totalJSHeapSize: tMsg[3],
        usedJSHeapSize: tMsg[4],
      }
    }
    
    case 50: {
      return {
        tp: MType.StringDict,
        key: tMsg[1],
        value: tMsg[2],
      }
    }
    
    case 51: {
      return {
        tp: MType.SetNodeAttributeDict,
        id: tMsg[1],
        nameKey: tMsg[2],
        valueKey: tMsg[3],
      }
    }
    
    case 53: {
      return {
        tp: MType.ResourceTimingDeprecated,
        timestamp: tMsg[1],
        duration: tMsg[2],
        ttfb: tMsg[3],
        headerSize: tMsg[4],
        encodedBodySize: tMsg[5],
        decodedBodySize: tMsg[6],
        url: tMsg[7],
        initiator: tMsg[8],
      }
    }
    
    case 54: {
      return {
        tp: MType.ConnectionInformation,
        downlink: tMsg[1],
        type: tMsg[2],
      }
    }
    
    case 55: {
      return {
        tp: MType.SetPageVisibility,
        hidden: tMsg[1],
      }
    }
    
    case 57: {
      return {
        tp: MType.LoadFontFace,
        parentID: tMsg[1],
        family: tMsg[2],
        source: tMsg[3],
        descriptors: tMsg[4],
      }
    }
    
    case 58: {
      return {
        tp: MType.SetNodeFocus,
        id: tMsg[1],
      }
    }
    
    case 59: {
      return {
        tp: MType.LongTask,
        timestamp: tMsg[1],
        duration: tMsg[2],
        context: tMsg[3],
        containerType: tMsg[4],
        containerSrc: tMsg[5],
        containerId: tMsg[6],
        containerName: tMsg[7],
      }
    }
    
    case 60: {
      return {
        tp: MType.SetNodeAttributeURLBased,
        id: tMsg[1],
        name: tMsg[2],
        value: tMsg[3],
        baseURL: tMsg[4],
      }
    }
    
    case 61: {
      return {
        tp: MType.SetCssDataURLBased,
        id: tMsg[1],
        data: tMsg[2],
        baseURL: tMsg[3],
      }
    }
    
    case 67: {
      return {
        tp: MType.CssInsertRuleURLBased,
        id: tMsg[1],
        rule: tMsg[2],
        index: tMsg[3],
        baseURL: tMsg[4],
      }
    }
    
    case 69: {
      return {
        tp: MType.MouseClick,
        id: tMsg[1],
        hesitationTime: tMsg[2],
        label: tMsg[3],
        selector: tMsg[4],
      }
    }
    
    case 70: {
      return {
        tp: MType.CreateIFrameDocument,
        frameID: tMsg[1],
        id: tMsg[2],
      }
    }
    
    case 71: {
      return {
        tp: MType.AdoptedSsReplaceURLBased,
        sheetID: tMsg[1],
        text: tMsg[2],
        baseURL: tMsg[3],
      }
    }
    
    case 73: {
      return {
        tp: MType.AdoptedSsInsertRuleURLBased,
        sheetID: tMsg[1],
        rule: tMsg[2],
        index: tMsg[3],
        baseURL: tMsg[4],
      }
    }
    
    case 75: {
      return {
        tp: MType.AdoptedSsDeleteRule,
        sheetID: tMsg[1],
        index: tMsg[2],
      }
    }
    
    case 76: {
      return {
        tp: MType.AdoptedSsAddOwner,
        sheetID: tMsg[1],
        id: tMsg[2],
      }
    }
    
    case 77: {
      return {
        tp: MType.AdoptedSsRemoveOwner,
        sheetID: tMsg[1],
        id: tMsg[2],
      }
    }
    
    case 79: {
      return {
        tp: MType.Zustand,
        mutation: tMsg[1],
        state: tMsg[2],
      }
    }
    
    case 83: {
      return {
        tp: MType.NetworkRequest,
        type: tMsg[1],
        method: tMsg[2],
        url: tMsg[3],
        request: tMsg[4],
        response: tMsg[5],
        status: tMsg[6],
        timestamp: tMsg[7],
        duration: tMsg[8],
        transferredBodySize: tMsg[9],
      }
    }
    
    case 84: {
      return {
        tp: MType.WsChannel,
        chType: tMsg[1],
        channelName: tMsg[2],
        data: tMsg[3],
        timestamp: tMsg[4],
        dir: tMsg[5],
        messageType: tMsg[6],
      }
    }
    
    case 113: {
      return {
        tp: MType.SelectionChange,
        selectionStart: tMsg[1],
        selectionEnd: tMsg[2],
        selection: tMsg[3],
      }
    }
    
    case 114: {
      return {
        tp: MType.MouseThrashing,
        timestamp: tMsg[1],
      }
    }
    
    case 116: {
      return {
        tp: MType.ResourceTiming,
        timestamp: tMsg[1],
        duration: tMsg[2],
        ttfb: tMsg[3],
        headerSize: tMsg[4],
        encodedBodySize: tMsg[5],
        decodedBodySize: tMsg[6],
        url: tMsg[7],
        initiator: tMsg[8],
        transferredSize: tMsg[9],
        cached: tMsg[10],
      }
    }
    
    case 117: {
      return {
        tp: MType.TabChange,
        tabId: tMsg[1],
      }
    }
    
    case 118: {
      return {
        tp: MType.TabData,
        tabId: tMsg[1],
      }
    }
    
    case 119: {
      return {
        tp: MType.CanvasNode,
        nodeId: tMsg[1],
        timestamp: tMsg[2],
      }
    }
    
    case 120: {
      return {
        tp: MType.TagTrigger,
        tagId: tMsg[1],
      }
    }
    
    default:
      return null
  }

}
