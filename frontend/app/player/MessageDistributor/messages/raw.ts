// Auto-generated, do not edit
/* eslint-disable */


export interface RawTimestamp {
  tp: "timestamp",
  timestamp: number,
}

export interface RawSetPageLocation {
  tp: "set_page_location",
  url: string,
  referrer: string,
  navigationStart: number,
}

export interface RawSetViewportSize {
  tp: "set_viewport_size",
  width: number,
  height: number,
}

export interface RawSetViewportScroll {
  tp: "set_viewport_scroll",
  x: number,
  y: number,
}

export interface RawCreateDocument {
  tp: "create_document",

}

export interface RawCreateElementNode {
  tp: "create_element_node",
  id: number,
  parentID: number,
  index: number,
  tag: string,
  svg: boolean,
}

export interface RawCreateTextNode {
  tp: "create_text_node",
  id: number,
  parentID: number,
  index: number,
}

export interface RawMoveNode {
  tp: "move_node",
  id: number,
  parentID: number,
  index: number,
}

export interface RawRemoveNode {
  tp: "remove_node",
  id: number,
}

export interface RawSetNodeAttribute {
  tp: "set_node_attribute",
  id: number,
  name: string,
  value: string,
}

export interface RawRemoveNodeAttribute {
  tp: "remove_node_attribute",
  id: number,
  name: string,
}

export interface RawSetNodeData {
  tp: "set_node_data",
  id: number,
  data: string,
}

export interface RawSetCssData {
  tp: "set_css_data",
  id: number,
  data: string,
}

export interface RawSetNodeScroll {
  tp: "set_node_scroll",
  id: number,
  x: number,
  y: number,
}

export interface RawSetInputValue {
  tp: "set_input_value",
  id: number,
  value: string,
  mask: number,
}

export interface RawSetInputChecked {
  tp: "set_input_checked",
  id: number,
  checked: boolean,
}

export interface RawMouseMove {
  tp: "mouse_move",
  x: number,
  y: number,
}

export interface RawConsoleLog {
  tp: "console_log",
  level: string,
  value: string,
}

export interface RawCssInsertRule {
  tp: "css_insert_rule",
  id: number,
  rule: string,
  index: number,
}

export interface RawCssDeleteRule {
  tp: "css_delete_rule",
  id: number,
  index: number,
}

export interface RawFetch {
  tp: "fetch",
  method: string,
  url: string,
  request: string,
  response: string,
  status: number,
  timestamp: number,
  duration: number,
}

export interface RawProfiler {
  tp: "profiler",
  name: string,
  duration: number,
  args: string,
  result: string,
}

export interface RawOTable {
  tp: "o_table",
  key: string,
  value: string,
}

export interface RawRedux {
  tp: "redux",
  action: string,
  state: string,
  duration: number,
}

export interface RawVuex {
  tp: "vuex",
  mutation: string,
  state: string,
}

export interface RawMobX {
  tp: "mob_x",
  type: string,
  payload: string,
}

export interface RawNgRx {
  tp: "ng_rx",
  action: string,
  state: string,
  duration: number,
}

export interface RawGraphQl {
  tp: "graph_ql",
  operationKind: string,
  operationName: string,
  variables: string,
  response: string,
}

export interface RawPerformanceTrack {
  tp: "performance_track",
  frames: number,
  ticks: number,
  totalJSHeapSize: number,
  usedJSHeapSize: number,
}

export interface RawConnectionInformation {
  tp: "connection_information",
  downlink: number,
  type: string,
}

export interface RawSetPageVisibility {
  tp: "set_page_visibility",
  hidden: boolean,
}

export interface RawLongTask {
  tp: "long_task",
  timestamp: number,
  duration: number,
  context: number,
  containerType: number,
  containerSrc: string,
  containerId: string,
  containerName: string,
}

export interface RawSetNodeAttributeURLBased {
  tp: "set_node_attribute_url_based",
  id: number,
  name: string,
  value: string,
  baseURL: string,
}

export interface RawSetCssDataURLBased {
  tp: "set_css_data_url_based",
  id: number,
  data: string,
  baseURL: string,
}

export interface RawCssInsertRuleURLBased {
  tp: "css_insert_rule_url_based",
  id: number,
  rule: string,
  index: number,
  baseURL: string,
}

export interface RawMouseClick {
  tp: "mouse_click",
  id: number,
  hesitationTime: number,
  label: string,
  selector: string,
}

export interface RawCreateIFrameDocument {
  tp: "create_i_frame_document",
  frameID: number,
  id: number,
}

export interface RawAdoptedSsReplaceURLBased {
  tp: "adopted_ss_replace_url_based",
  sheetID: number,
  text: string,
  baseURL: string,
}

export interface RawAdoptedSsReplace {
  tp: "adopted_ss_replace",
  sheetID: number,
  text: string,
}

export interface RawAdoptedSsInsertRuleURLBased {
  tp: "adopted_ss_insert_rule_url_based",
  sheetID: number,
  rule: string,
  index: number,
  baseURL: string,
}

export interface RawAdoptedSsInsertRule {
  tp: "adopted_ss_insert_rule",
  sheetID: number,
  rule: string,
  index: number,
}

export interface RawAdoptedSsDeleteRule {
  tp: "adopted_ss_delete_rule",
  sheetID: number,
  index: number,
}

export interface RawAdoptedSsAddOwner {
  tp: "adopted_ss_add_owner",
  sheetID: number,
  id: number,
}

export interface RawAdoptedSsRemoveOwner {
  tp: "adopted_ss_remove_owner",
  sheetID: number,
  id: number,
}

export interface RawZustand {
  tp: "zustand",
  mutation: string,
  state: string,
}

export interface RawIosSessionStart {
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

export interface RawIosCustomEvent {
  tp: "ios_custom_event",
  timestamp: number,
  length: number,
  name: string,
  payload: string,
}

export interface RawIosScreenChanges {
  tp: "ios_screen_changes",
  timestamp: number,
  length: number,
  x: number,
  y: number,
  width: number,
  height: number,
}

export interface RawIosClickEvent {
  tp: "ios_click_event",
  timestamp: number,
  length: number,
  label: string,
  x: number,
  y: number,
}

export interface RawIosPerformanceEvent {
  tp: "ios_performance_event",
  timestamp: number,
  length: number,
  name: string,
  value: number,
}

export interface RawIosLog {
  tp: "ios_log",
  timestamp: number,
  length: number,
  severity: string,
  content: string,
}

export interface RawIosNetworkCall {
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


export type RawMessage = RawTimestamp | RawSetPageLocation | RawSetViewportSize | RawSetViewportScroll | RawCreateDocument | RawCreateElementNode | RawCreateTextNode | RawMoveNode | RawRemoveNode | RawSetNodeAttribute | RawRemoveNodeAttribute | RawSetNodeData | RawSetCssData | RawSetNodeScroll | RawSetInputValue | RawSetInputChecked | RawMouseMove | RawConsoleLog | RawCssInsertRule | RawCssDeleteRule | RawFetch | RawProfiler | RawOTable | RawRedux | RawVuex | RawMobX | RawNgRx | RawGraphQl | RawPerformanceTrack | RawConnectionInformation | RawSetPageVisibility | RawLongTask | RawSetNodeAttributeURLBased | RawSetCssDataURLBased | RawCssInsertRuleURLBased | RawMouseClick | RawCreateIFrameDocument | RawAdoptedSsReplaceURLBased | RawAdoptedSsReplace | RawAdoptedSsInsertRuleURLBased | RawAdoptedSsInsertRule | RawAdoptedSsDeleteRule | RawAdoptedSsAddOwner | RawAdoptedSsRemoveOwner | RawZustand | RawIosSessionStart | RawIosCustomEvent | RawIosScreenChanges | RawIosClickEvent | RawIosPerformanceEvent | RawIosLog | RawIosNetworkCall;
