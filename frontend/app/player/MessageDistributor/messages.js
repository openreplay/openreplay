// Auto-generated, do not edit

import { readUint, readInt, readString, readBoolean } from './readPrimitives'


export type Timestamp = {
  tp: "timestamp",
  timestamp: number,
}

export type SessionDisconnect = {
  tp: "session_disconnect",
  timestamp: number,
}

export type SetPageLocation = {
  tp: "set_page_location",
  url: string,
  referrer: string,
  navigationStart: number,
}

export type SetViewportSize = {
  tp: "set_viewport_size",
  width: number,
  height: number,
}

export type SetViewportScroll = {
  tp: "set_viewport_scroll",
  x: number,
  y: number,
}

export type CreateDocument = {
  tp: "create_document",

}

export type CreateElementNode = {
  tp: "create_element_node",
  id: number,
  parentID: number,
  index: number,
  tag: string,
  svg: boolean,
}

export type CreateTextNode = {
  tp: "create_text_node",
  id: number,
  parentID: number,
  index: number,
}

export type MoveNode = {
  tp: "move_node",
  id: number,
  parentID: number,
  index: number,
}

export type RemoveNode = {
  tp: "remove_node",
  id: number,
}

export type SetNodeAttribute = {
  tp: "set_node_attribute",
  id: number,
  name: string,
  value: string,
}

export type RemoveNodeAttribute = {
  tp: "remove_node_attribute",
  id: number,
  name: string,
}

export type SetNodeData = {
  tp: "set_node_data",
  id: number,
  data: string,
}

export type SetCssData = {
  tp: "set_css_data",
  id: number,
  data: string,
}

export type SetNodeScroll = {
  tp: "set_node_scroll",
  id: number,
  x: number,
  y: number,
}

export type SetInputValue = {
  tp: "set_input_value",
  id: number,
  value: string,
  mask: number,
}

export type SetInputChecked = {
  tp: "set_input_checked",
  id: number,
  checked: boolean,
}

export type MouseMove = {
  tp: "mouse_move",
  x: number,
  y: number,
}

export type ConsoleLog = {
  tp: "console_log",
  level: string,
  value: string,
}

export type PerformanceTrack = {
  tp: "performance_track",
  frames: number,
  ticks: number,
  totalJSHeapSize: number,
  usedJSHeapSize: number,
}

export type ConnectionInformation = {
  tp: "connection_information",
  downlink: number,
  type: string,
}

export type SetPageVisibility = {
  tp: "set_page_visibility",
  hidden: boolean,
}

export type CssInsertRule = {
  tp: "css_insert_rule",
  id: number,
  rule: string,
  index: number,
}

export type CssDeleteRule = {
  tp: "css_delete_rule",
  id: number,
  index: number,
}

export type Fetch = {
  tp: "fetch",
  method: string,
  url: string,
  request: string,
  response: string,
  status: number,
  timestamp: number,
  duration: number,
}

export type Profiler = {
  tp: "profiler",
  name: string,
  duration: number,
  args: string,
  result: string,
}

export type OTable = {
  tp: "o_table",
  key: string,
  value: string,
}

export type Redux = {
  tp: "redux",
  action: string,
  state: string,
  duration: number,
}

export type Vuex = {
  tp: "vuex",
  mutation: string,
  state: string,
}

export type MobX = {
  tp: "mob_x",
  type: string,
  payload: string,
}

export type NgRx = {
  tp: "ng_rx",
  action: string,
  state: string,
  duration: number,
}

export type GraphQl = {
  tp: "graph_ql",
  operationKind: string,
  operationName: string,
  variables: string,
  response: string,
}

export type LongTask = {
  tp: "long_task",
  timestamp: number,
  duration: number,
  context: number,
  containerType: number,
  containerSrc: string,
  containerId: string,
  containerName: string,
}

export type TechnicalInfo = {
  tp: "technical_info",
  type: string,
  value: string,
}

export type IosSessionStart = {
  tp: "ios_session_start",
  timestamp: number,
  projectID: number,
  trackerVersion: string,
  revID: string,
  userUUID: string,
  userOS: string,
  userOSVersion: string,
  userDevice: string,
  userDeviceType: string,
  userCountry: string,
}

export type IosCustomEvent = {
  tp: "ios_custom_event",
  timestamp: number,
  length: number,
  name: string,
  payload: string,
}

export type IosClickEvent = {
  tp: "ios_click_event",
  timestamp: number,
  length: number,
  label: string,
  x: number,
  y: number,
}

export type IosPerformanceEvent = {
  tp: "ios_performance_event",
  timestamp: number,
  length: number,
  name: string,
  value: number,
}

export type IosLog = {
  tp: "ios_log",
  timestamp: number,
  length: number,
  severity: string,
  content: string,
}

export type IosNetworkCall = {
  tp: "ios_network_call",
  timestamp: number,
  length: number,
  duration: number,
  headers: string,
  body: string,
  url: string,
  success: boolean,
  method: string,
  status: number,
}


export type Message = Timestamp | SessionDisconnect | SetPageLocation | SetViewportSize | SetViewportScroll | CreateDocument | CreateElementNode | CreateTextNode | MoveNode | RemoveNode | SetNodeAttribute | RemoveNodeAttribute | SetNodeData | SetCssData | SetNodeScroll | SetInputValue | SetInputChecked | MouseMove | ConsoleLog | PerformanceTrack | ConnectionInformation | SetPageVisibility | CssInsertRule | CssDeleteRule | Fetch | Profiler | OTable | Redux | Vuex | MobX | NgRx | GraphQl | LongTask | TechnicalInfo | IosSessionStart | IosCustomEvent | IosClickEvent | IosPerformanceEvent | IosLog | IosNetworkCall;

export default function (buf: Uint8Array, p: number): [Message, number] {
  const msg = {};
  let r;
  switch (buf[p++]) {
  
  case 0:
    (msg:Timestamp).tp = "timestamp";
    r = readUint(buf, p); msg.timestamp = r[0]; p = r[1];
    break;
  
  case 2:
    (msg:SessionDisconnect).tp = "session_disconnect";
    r = readUint(buf, p); msg.timestamp = r[0]; p = r[1];
    break;
  
  case 4:
    (msg:SetPageLocation).tp = "set_page_location";
    r = readString(buf, p); msg.url = r[0]; p = r[1];
r = readString(buf, p); msg.referrer = r[0]; p = r[1];
r = readUint(buf, p); msg.navigationStart = r[0]; p = r[1];
    break;
  
  case 5:
    (msg:SetViewportSize).tp = "set_viewport_size";
    r = readUint(buf, p); msg.width = r[0]; p = r[1];
r = readUint(buf, p); msg.height = r[0]; p = r[1];
    break;
  
  case 6:
    (msg:SetViewportScroll).tp = "set_viewport_scroll";
    r = readInt(buf, p); msg.x = r[0]; p = r[1];
r = readInt(buf, p); msg.y = r[0]; p = r[1];
    break;
  
  case 7:
    (msg:CreateDocument).tp = "create_document";
    
    break;
  
  case 8:
    (msg:CreateElementNode).tp = "create_element_node";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readUint(buf, p); msg.parentID = r[0]; p = r[1];
r = readUint(buf, p); msg.index = r[0]; p = r[1];
r = readString(buf, p); msg.tag = r[0]; p = r[1];
r = readBoolean(buf, p); msg.svg = r[0]; p = r[1];
    break;
  
  case 9:
    (msg:CreateTextNode).tp = "create_text_node";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readUint(buf, p); msg.parentID = r[0]; p = r[1];
r = readUint(buf, p); msg.index = r[0]; p = r[1];
    break;
  
  case 10:
    (msg:MoveNode).tp = "move_node";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readUint(buf, p); msg.parentID = r[0]; p = r[1];
r = readUint(buf, p); msg.index = r[0]; p = r[1];
    break;
  
  case 11:
    (msg:RemoveNode).tp = "remove_node";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
    break;
  
  case 12:
    (msg:SetNodeAttribute).tp = "set_node_attribute";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readString(buf, p); msg.name = r[0]; p = r[1];
r = readString(buf, p); msg.value = r[0]; p = r[1];
    break;
  
  case 13:
    (msg:RemoveNodeAttribute).tp = "remove_node_attribute";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readString(buf, p); msg.name = r[0]; p = r[1];
    break;
  
  case 14:
    (msg:SetNodeData).tp = "set_node_data";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readString(buf, p); msg.data = r[0]; p = r[1];
    break;
  
  case 15:
    (msg:SetCssData).tp = "set_css_data";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readString(buf, p); msg.data = r[0]; p = r[1];
    break;
  
  case 16:
    (msg:SetNodeScroll).tp = "set_node_scroll";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readInt(buf, p); msg.x = r[0]; p = r[1];
r = readInt(buf, p); msg.y = r[0]; p = r[1];
    break;
  
  case 18:
    (msg:SetInputValue).tp = "set_input_value";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readString(buf, p); msg.value = r[0]; p = r[1];
r = readInt(buf, p); msg.mask = r[0]; p = r[1];
    break;
  
  case 19:
    (msg:SetInputChecked).tp = "set_input_checked";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readBoolean(buf, p); msg.checked = r[0]; p = r[1];
    break;
  
  case 20:
    (msg:MouseMove).tp = "mouse_move";
    r = readUint(buf, p); msg.x = r[0]; p = r[1];
r = readUint(buf, p); msg.y = r[0]; p = r[1];
    break;
  
  case 22:
    (msg:ConsoleLog).tp = "console_log";
    r = readString(buf, p); msg.level = r[0]; p = r[1];
r = readString(buf, p); msg.value = r[0]; p = r[1];
    break;
  
  case 49:
    (msg:PerformanceTrack).tp = "performance_track";
    r = readInt(buf, p); msg.frames = r[0]; p = r[1];
r = readInt(buf, p); msg.ticks = r[0]; p = r[1];
r = readUint(buf, p); msg.totalJSHeapSize = r[0]; p = r[1];
r = readUint(buf, p); msg.usedJSHeapSize = r[0]; p = r[1];
    break;
  
  case 54:
    (msg:ConnectionInformation).tp = "connection_information";
    r = readUint(buf, p); msg.downlink = r[0]; p = r[1];
r = readString(buf, p); msg.type = r[0]; p = r[1];
    break;
  
  case 55:
    (msg:SetPageVisibility).tp = "set_page_visibility";
    r = readBoolean(buf, p); msg.hidden = r[0]; p = r[1];
    break;
  
  case 37:
    (msg:CssInsertRule).tp = "css_insert_rule";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readString(buf, p); msg.rule = r[0]; p = r[1];
r = readUint(buf, p); msg.index = r[0]; p = r[1];
    break;
  
  case 38:
    (msg:CssDeleteRule).tp = "css_delete_rule";
    r = readUint(buf, p); msg.id = r[0]; p = r[1];
r = readUint(buf, p); msg.index = r[0]; p = r[1];
    break;
  
  case 39:
    (msg:Fetch).tp = "fetch";
    r = readString(buf, p); msg.method = r[0]; p = r[1];
r = readString(buf, p); msg.url = r[0]; p = r[1];
r = readString(buf, p); msg.request = r[0]; p = r[1];
r = readString(buf, p); msg.response = r[0]; p = r[1];
r = readUint(buf, p); msg.status = r[0]; p = r[1];
r = readUint(buf, p); msg.timestamp = r[0]; p = r[1];
r = readUint(buf, p); msg.duration = r[0]; p = r[1];
    break;
  
  case 40:
    (msg:Profiler).tp = "profiler";
    r = readString(buf, p); msg.name = r[0]; p = r[1];
r = readUint(buf, p); msg.duration = r[0]; p = r[1];
r = readString(buf, p); msg.args = r[0]; p = r[1];
r = readString(buf, p); msg.result = r[0]; p = r[1];
    break;
  
  case 41:
    (msg:OTable).tp = "o_table";
    r = readString(buf, p); msg.key = r[0]; p = r[1];
r = readString(buf, p); msg.value = r[0]; p = r[1];
    break;
  
  case 44:
    (msg:Redux).tp = "redux";
    r = readString(buf, p); msg.action = r[0]; p = r[1];
r = readString(buf, p); msg.state = r[0]; p = r[1];
r = readUint(buf, p); msg.duration = r[0]; p = r[1];
    break;
  
  case 45:
    (msg:Vuex).tp = "vuex";
    r = readString(buf, p); msg.mutation = r[0]; p = r[1];
r = readString(buf, p); msg.state = r[0]; p = r[1];
    break;
  
  case 46:
    (msg:MobX).tp = "mob_x";
    r = readString(buf, p); msg.type = r[0]; p = r[1];
r = readString(buf, p); msg.payload = r[0]; p = r[1];
    break;
  
  case 47:
    (msg:NgRx).tp = "ng_rx";
    r = readString(buf, p); msg.action = r[0]; p = r[1];
r = readString(buf, p); msg.state = r[0]; p = r[1];
r = readUint(buf, p); msg.duration = r[0]; p = r[1];
    break;
  
  case 48:
    (msg:GraphQl).tp = "graph_ql";
    r = readString(buf, p); msg.operationKind = r[0]; p = r[1];
r = readString(buf, p); msg.operationName = r[0]; p = r[1];
r = readString(buf, p); msg.variables = r[0]; p = r[1];
r = readString(buf, p); msg.response = r[0]; p = r[1];
    break;
  
  case 59:
    (msg:LongTask).tp = "long_task";
    r = readUint(buf, p); msg.timestamp = r[0]; p = r[1];
r = readUint(buf, p); msg.duration = r[0]; p = r[1];
r = readUint(buf, p); msg.context = r[0]; p = r[1];
r = readUint(buf, p); msg.containerType = r[0]; p = r[1];
r = readString(buf, p); msg.containerSrc = r[0]; p = r[1];
r = readString(buf, p); msg.containerId = r[0]; p = r[1];
r = readString(buf, p); msg.containerName = r[0]; p = r[1];
    break;
  
  case 63:
    (msg:TechnicalInfo).tp = "technical_info";
    r = readString(buf, p); msg.type = r[0]; p = r[1];
r = readString(buf, p); msg.value = r[0]; p = r[1];
    break;
  
  case 90:
    (msg:IosSessionStart).tp = "ios_session_start";
    r = readUint(buf, p); msg.timestamp = r[0]; p = r[1];
r = readUint(buf, p); msg.projectID = r[0]; p = r[1];
r = readString(buf, p); msg.trackerVersion = r[0]; p = r[1];
r = readString(buf, p); msg.revID = r[0]; p = r[1];
r = readString(buf, p); msg.userUUID = r[0]; p = r[1];
r = readString(buf, p); msg.userOS = r[0]; p = r[1];
r = readString(buf, p); msg.userOSVersion = r[0]; p = r[1];
r = readString(buf, p); msg.userDevice = r[0]; p = r[1];
r = readString(buf, p); msg.userDeviceType = r[0]; p = r[1];
r = readString(buf, p); msg.userCountry = r[0]; p = r[1];
    break;
  
  case 93:
    (msg:IosCustomEvent).tp = "ios_custom_event";
    r = readUint(buf, p); msg.timestamp = r[0]; p = r[1];
r = readUint(buf, p); msg.length = r[0]; p = r[1];
r = readString(buf, p); msg.name = r[0]; p = r[1];
r = readString(buf, p); msg.payload = r[0]; p = r[1];
    break;
  
  case 100:
    (msg:IosClickEvent).tp = "ios_click_event";
    r = readUint(buf, p); msg.timestamp = r[0]; p = r[1];
r = readUint(buf, p); msg.length = r[0]; p = r[1];
r = readString(buf, p); msg.label = r[0]; p = r[1];
r = readUint(buf, p); msg.x = r[0]; p = r[1];
r = readUint(buf, p); msg.y = r[0]; p = r[1];
    break;
  
  case 102:
    (msg:IosPerformanceEvent).tp = "ios_performance_event";
    r = readUint(buf, p); msg.timestamp = r[0]; p = r[1];
r = readUint(buf, p); msg.length = r[0]; p = r[1];
r = readString(buf, p); msg.name = r[0]; p = r[1];
r = readUint(buf, p); msg.value = r[0]; p = r[1];
    break;
  
  case 103:
    (msg:IosLog).tp = "ios_log";
    r = readUint(buf, p); msg.timestamp = r[0]; p = r[1];
r = readUint(buf, p); msg.length = r[0]; p = r[1];
r = readString(buf, p); msg.severity = r[0]; p = r[1];
r = readString(buf, p); msg.content = r[0]; p = r[1];
    break;
  
  case 105:
    (msg:IosNetworkCall).tp = "ios_network_call";
    r = readUint(buf, p); msg.timestamp = r[0]; p = r[1];
r = readUint(buf, p); msg.length = r[0]; p = r[1];
r = readUint(buf, p); msg.duration = r[0]; p = r[1];
r = readString(buf, p); msg.headers = r[0]; p = r[1];
r = readString(buf, p); msg.body = r[0]; p = r[1];
r = readString(buf, p); msg.url = r[0]; p = r[1];
r = readBoolean(buf, p); msg.success = r[0]; p = r[1];
r = readString(buf, p); msg.method = r[0]; p = r[1];
r = readUint(buf, p); msg.status = r[0]; p = r[1];
    break;
  
  default:
    let len;
    [ _, p ] = readUint(buf, p);
    [ len, p ] = readUint(buf, p);
    return [null, p + len] // skip
    //throw `Unknown type (${buf[p-1]})`;
  }
  return [msg, p];
}
