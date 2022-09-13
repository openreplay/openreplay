// Auto-generated, do not edit
/* eslint-disable */

import type { RawMessage } from './raw'


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

type TrJSException = [
  type: 25,
  name: string,
  message: string,
  payload: string,
]

type TrRawCustomEvent = [
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

type TrResourceTiming = [
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

type TrZustand = [
  type: 79,
  mutation: string,
  state: string,
]


export type TrackerMessage = TrBatchMetadata | TrPartitionedMessage | TrTimestamp | TrSetPageLocation | TrSetViewportSize | TrSetViewportScroll | TrCreateDocument | TrCreateElementNode | TrCreateTextNode | TrMoveNode | TrRemoveNode | TrSetNodeAttribute | TrRemoveNodeAttribute | TrSetNodeData | TrSetNodeScroll | TrSetInputTarget | TrSetInputValue | TrSetInputChecked | TrMouseMove | TrConsoleLog | TrPageLoadTiming | TrPageRenderTiming | TrJSException | TrRawCustomEvent | TrUserID | TrUserAnonymousID | TrMetadata | TrCSSInsertRule | TrCSSDeleteRule | TrFetch | TrProfiler | TrOTable | TrStateAction | TrRedux | TrVuex | TrMobX | TrNgRx | TrGraphQL | TrPerformanceTrack | TrResourceTiming | TrConnectionInformation | TrSetPageVisibility | TrLongTask | TrSetNodeAttributeURLBased | TrSetCSSDataURLBased | TrTechnicalInfo | TrCustomIssue | TrCSSInsertRuleURLBased | TrMouseClick | TrCreateIFrameDocument | TrAdoptedSSReplaceURLBased | TrAdoptedSSInsertRuleURLBased | TrAdoptedSSDeleteRule | TrAdoptedSSAddOwner | TrAdoptedSSRemoveOwner | TrZustand

export default function translate(tMsg: TrackerMessage): RawMessage | null {
  switch(tMsg[0]) {
    
    case 0: {
      return {
        tp: "timestamp",
        timestamp: tMsg[1],
      }
    }
    
    case 4: {
      return {
        tp: "set_page_location",
        url: tMsg[1],
        referrer: tMsg[2],
        navigationStart: tMsg[3],
      }
    }
    
    case 5: {
      return {
        tp: "set_viewport_size",
        width: tMsg[1],
        height: tMsg[2],
      }
    }
    
    case 6: {
      return {
        tp: "set_viewport_scroll",
        x: tMsg[1],
        y: tMsg[2],
      }
    }
    
    case 7: {
      return {
        tp: "create_document",
        
      }
    }
    
    case 8: {
      return {
        tp: "create_element_node",
        id: tMsg[1],
        parentID: tMsg[2],
        index: tMsg[3],
        tag: tMsg[4],
        svg: tMsg[5],
      }
    }
    
    case 9: {
      return {
        tp: "create_text_node",
        id: tMsg[1],
        parentID: tMsg[2],
        index: tMsg[3],
      }
    }
    
    case 10: {
      return {
        tp: "move_node",
        id: tMsg[1],
        parentID: tMsg[2],
        index: tMsg[3],
      }
    }
    
    case 11: {
      return {
        tp: "remove_node",
        id: tMsg[1],
      }
    }
    
    case 12: {
      return {
        tp: "set_node_attribute",
        id: tMsg[1],
        name: tMsg[2],
        value: tMsg[3],
      }
    }
    
    case 13: {
      return {
        tp: "remove_node_attribute",
        id: tMsg[1],
        name: tMsg[2],
      }
    }
    
    case 14: {
      return {
        tp: "set_node_data",
        id: tMsg[1],
        data: tMsg[2],
      }
    }
    
    case 16: {
      return {
        tp: "set_node_scroll",
        id: tMsg[1],
        x: tMsg[2],
        y: tMsg[3],
      }
    }
    
    case 18: {
      return {
        tp: "set_input_value",
        id: tMsg[1],
        value: tMsg[2],
        mask: tMsg[3],
      }
    }
    
    case 19: {
      return {
        tp: "set_input_checked",
        id: tMsg[1],
        checked: tMsg[2],
      }
    }
    
    case 20: {
      return {
        tp: "mouse_move",
        x: tMsg[1],
        y: tMsg[2],
      }
    }
    
    case 22: {
      return {
        tp: "console_log",
        level: tMsg[1],
        value: tMsg[2],
      }
    }
    
    case 37: {
      return {
        tp: "css_insert_rule",
        id: tMsg[1],
        rule: tMsg[2],
        index: tMsg[3],
      }
    }
    
    case 38: {
      return {
        tp: "css_delete_rule",
        id: tMsg[1],
        index: tMsg[2],
      }
    }
    
    case 39: {
      return {
        tp: "fetch",
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
        tp: "profiler",
        name: tMsg[1],
        duration: tMsg[2],
        args: tMsg[3],
        result: tMsg[4],
      }
    }
    
    case 41: {
      return {
        tp: "o_table",
        key: tMsg[1],
        value: tMsg[2],
      }
    }
    
    case 44: {
      return {
        tp: "redux",
        action: tMsg[1],
        state: tMsg[2],
        duration: tMsg[3],
      }
    }
    
    case 45: {
      return {
        tp: "vuex",
        mutation: tMsg[1],
        state: tMsg[2],
      }
    }
    
    case 46: {
      return {
        tp: "mob_x",
        type: tMsg[1],
        payload: tMsg[2],
      }
    }
    
    case 47: {
      return {
        tp: "ng_rx",
        action: tMsg[1],
        state: tMsg[2],
        duration: tMsg[3],
      }
    }
    
    case 48: {
      return {
        tp: "graph_ql",
        operationKind: tMsg[1],
        operationName: tMsg[2],
        variables: tMsg[3],
        response: tMsg[4],
      }
    }
    
    case 49: {
      return {
        tp: "performance_track",
        frames: tMsg[1],
        ticks: tMsg[2],
        totalJSHeapSize: tMsg[3],
        usedJSHeapSize: tMsg[4],
      }
    }
    
    case 54: {
      return {
        tp: "connection_information",
        downlink: tMsg[1],
        type: tMsg[2],
      }
    }
    
    case 55: {
      return {
        tp: "set_page_visibility",
        hidden: tMsg[1],
      }
    }
    
    case 59: {
      return {
        tp: "long_task",
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
        tp: "set_node_attribute_url_based",
        id: tMsg[1],
        name: tMsg[2],
        value: tMsg[3],
        baseURL: tMsg[4],
      }
    }
    
    case 61: {
      return {
        tp: "set_css_data_url_based",
        id: tMsg[1],
        data: tMsg[2],
        baseURL: tMsg[3],
      }
    }
    
    case 67: {
      return {
        tp: "css_insert_rule_url_based",
        id: tMsg[1],
        rule: tMsg[2],
        index: tMsg[3],
        baseURL: tMsg[4],
      }
    }
    
    case 69: {
      return {
        tp: "mouse_click",
        id: tMsg[1],
        hesitationTime: tMsg[2],
        label: tMsg[3],
        selector: tMsg[4],
      }
    }
    
    case 70: {
      return {
        tp: "create_i_frame_document",
        frameID: tMsg[1],
        id: tMsg[2],
      }
    }
    
    case 71: {
      return {
        tp: "adopted_ss_replace_url_based",
        sheetID: tMsg[1],
        text: tMsg[2],
        baseURL: tMsg[3],
      }
    }
    
    case 73: {
      return {
        tp: "adopted_ss_insert_rule_url_based",
        sheetID: tMsg[1],
        rule: tMsg[2],
        index: tMsg[3],
        baseURL: tMsg[4],
      }
    }
    
    case 75: {
      return {
        tp: "adopted_ss_delete_rule",
        sheetID: tMsg[1],
        index: tMsg[2],
      }
    }
    
    case 76: {
      return {
        tp: "adopted_ss_add_owner",
        sheetID: tMsg[1],
        id: tMsg[2],
      }
    }
    
    case 77: {
      return {
        tp: "adopted_ss_remove_owner",
        sheetID: tMsg[1],
        id: tMsg[2],
      }
    }
    
    case 79: {
      return {
        tp: "zustand",
        mutation: tMsg[1],
        state: tMsg[2],
      }
    }
    
    default:
      return null
  }

}
