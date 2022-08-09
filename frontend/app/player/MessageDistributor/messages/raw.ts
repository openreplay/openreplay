// Auto-generated, do not edit

export const TP_MAP = {
  80: "batch_meta",
  81: "batch_metadata",
  82: "partitioned_message",
  0: "timestamp",
  4: "set_page_location",
  5: "set_viewport_size",
  6: "set_viewport_scroll",
  7: "create_document",
  8: "create_element_node",
  9: "create_text_node",
  10: "move_node",
  11: "remove_node",
  12: "set_node_attribute",
  13: "remove_node_attribute",
  14: "set_node_data",
  15: "set_css_data",
  16: "set_node_scroll",
  17: "set_input_target",
  18: "set_input_value",
  19: "set_input_checked",
  20: "mouse_move",
  22: "console_log",
  23: "page_load_timing",
  24: "page_render_timing",
  25: "js_exception",
  27: "raw_custom_event",
  28: "user_id",
  29: "user_anonymous_id",
  30: "metadata",
  37: "css_insert_rule",
  38: "css_delete_rule",
  39: "fetch",
  40: "profiler",
  41: "o_table",
  42: "state_action",
  44: "redux",
  45: "vuex",
  46: "mob_x",
  47: "ng_rx",
  48: "graph_ql",
  49: "performance_track",
  53: "resource_timing",
  54: "connection_information",
  55: "set_page_visibility",
  59: "long_task",
  60: "set_node_attribute_url_based",
  61: "set_css_data_url_based",
  63: "technical_info",
  64: "custom_issue",
  67: "css_insert_rule_url_based",
  69: "mouse_click",
  70: "create_i_frame_document",
  71: "adopted_ss_replace_url_based",
  72: "adopted_ss_replace",
  73: "adopted_ss_insert_rule_url_based",
  74: "adopted_ss_insert_rule",
  75: "adopted_ss_delete_rule",
  76: "adopted_ss_add_owner",
  77: "adopted_ss_remove_owner",
  90: "ios_session_start",
  93: "ios_custom_event",
  96: "ios_screen_changes",
  100: "ios_click_event",
  102: "ios_performance_event",
  103: "ios_log",
  105: "ios_network_call",
} as const


export interface RawBatchMeta {
  tp: "batch_meta",
  pageNo: number,
  firstIndex: number,
  timestamp: number,
}

export interface RawBatchMetadata {
  tp: "batch_metadata",
  version: number,
  pageNo: number,
  firstIndex: number,
  timestamp: number,
  location: string,
}

export interface RawPartitionedMessage {
  tp: "partitioned_message",
  partNo: number,
  partTotal: number,
}

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

export interface RawSetInputTarget {
  tp: "set_input_target",
  id: number,
  label: string,
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

export interface RawPageLoadTiming {
  tp: "page_load_timing",
  requestStart: number,
  responseStart: number,
  responseEnd: number,
  domContentLoadedEventStart: number,
  domContentLoadedEventEnd: number,
  loadEventStart: number,
  loadEventEnd: number,
  firstPaint: number,
  firstContentfulPaint: number,
}

export interface RawPageRenderTiming {
  tp: "page_render_timing",
  speedIndex: number,
  visuallyComplete: number,
  timeToInteractive: number,
}

export interface RawJsException {
  tp: "js_exception",
  name: string,
  message: string,
  payload: string,
}

export interface RawRawCustomEvent {
  tp: "raw_custom_event",
  name: string,
  payload: string,
}

export interface RawUserID {
  tp: "user_id",
  id: string,
}

export interface RawUserAnonymousID {
  tp: "user_anonymous_id",
  id: string,
}

export interface RawMetadata {
  tp: "metadata",
  key: string,
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

export interface RawStateAction {
  tp: "state_action",
  type: string,
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

export interface RawResourceTiming {
  tp: "resource_timing",
  timestamp: number,
  duration: number,
  ttfb: number,
  headerSize: number,
  encodedBodySize: number,
  decodedBodySize: number,
  url: string,
  initiator: string,
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

export interface RawTechnicalInfo {
  tp: "technical_info",
  type: string,
  value: string,
}

export interface RawCustomIssue {
  tp: "custom_issue",
  name: string,
  payload: string,
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


export type RawMessage = RawBatchMeta | RawBatchMetadata | RawPartitionedMessage | RawTimestamp | RawSetPageLocation | RawSetViewportSize | RawSetViewportScroll | RawCreateDocument | RawCreateElementNode | RawCreateTextNode | RawMoveNode | RawRemoveNode | RawSetNodeAttribute | RawRemoveNodeAttribute | RawSetNodeData | RawSetCssData | RawSetNodeScroll | RawSetInputTarget | RawSetInputValue | RawSetInputChecked | RawMouseMove | RawConsoleLog | RawPageLoadTiming | RawPageRenderTiming | RawJsException | RawRawCustomEvent | RawUserID | RawUserAnonymousID | RawMetadata | RawCssInsertRule | RawCssDeleteRule | RawFetch | RawProfiler | RawOTable | RawStateAction | RawRedux | RawVuex | RawMobX | RawNgRx | RawGraphQl | RawPerformanceTrack | RawResourceTiming | RawConnectionInformation | RawSetPageVisibility | RawLongTask | RawSetNodeAttributeURLBased | RawSetCssDataURLBased | RawTechnicalInfo | RawCustomIssue | RawCssInsertRuleURLBased | RawMouseClick | RawCreateIFrameDocument | RawAdoptedSsReplaceURLBased | RawAdoptedSsReplace | RawAdoptedSsInsertRuleURLBased | RawAdoptedSsInsertRule | RawAdoptedSsDeleteRule | RawAdoptedSsAddOwner | RawAdoptedSsRemoveOwner | RawIosSessionStart | RawIosCustomEvent | RawIosScreenChanges | RawIosClickEvent | RawIosPerformanceEvent | RawIosLog | RawIosNetworkCall;
