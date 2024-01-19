// Auto-generated, do not edit
/* eslint-disable */

export const enum MType {
  Timestamp = 0,
  SetPageLocation = 4,
  SetViewportSize = 5,
  SetViewportScroll = 6,
  CreateDocument = 7,
  CreateElementNode = 8,
  CreateTextNode = 9,
  MoveNode = 10,
  RemoveNode = 11,
  SetNodeAttribute = 12,
  RemoveNodeAttribute = 13,
  SetNodeData = 14,
  SetCssData = 15,
  SetNodeScroll = 16,
  SetInputValue = 18,
  SetInputChecked = 19,
  MouseMove = 20,
  NetworkRequestDeprecated = 21,
  ConsoleLog = 22,
  CssInsertRule = 37,
  CssDeleteRule = 38,
  Fetch = 39,
  Profiler = 40,
  OTable = 41,
  Redux = 44,
  Vuex = 45,
  MobX = 46,
  NgRx = 47,
  GraphQl = 48,
  PerformanceTrack = 49,
  StringDict = 50,
  SetNodeAttributeDict = 51,
  ResourceTimingDeprecated = 53,
  ConnectionInformation = 54,
  SetPageVisibility = 55,
  LoadFontFace = 57,
  SetNodeFocus = 58,
  LongTask = 59,
  SetNodeAttributeURLBased = 60,
  SetCssDataURLBased = 61,
  CssInsertRuleURLBased = 67,
  MouseClick = 69,
  CreateIFrameDocument = 70,
  AdoptedSsReplaceURLBased = 71,
  AdoptedSsReplace = 72,
  AdoptedSsInsertRuleURLBased = 73,
  AdoptedSsInsertRule = 74,
  AdoptedSsDeleteRule = 75,
  AdoptedSsAddOwner = 76,
  AdoptedSsRemoveOwner = 77,
  Zustand = 79,
  NetworkRequest = 83,
  WsChannel = 84,
  SelectionChange = 113,
  MouseThrashing = 114,
  ResourceTiming = 116,
  TabChange = 117,
  TabData = 118,
  CanvasNode = 119,
  TagTrigger = 120,
  IosEvent = 93,
  IosScreenChanges = 96,
  IosClickEvent = 100,
  IosInputEvent = 101,
  IosPerformanceEvent = 102,
  IosLog = 103,
  IosInternalError = 104,
  IosNetworkCall = 105,
  IosSwipeEvent = 106,
  IosIssueEvent = 111,
}


export interface RawTimestamp {
  tp: MType.Timestamp,
  timestamp: number,
}

export interface RawSetPageLocation {
  tp: MType.SetPageLocation,
  url: string,
  referrer: string,
  navigationStart: number,
}

export interface RawSetViewportSize {
  tp: MType.SetViewportSize,
  width: number,
  height: number,
}

export interface RawSetViewportScroll {
  tp: MType.SetViewportScroll,
  x: number,
  y: number,
}

export interface RawCreateDocument {
  tp: MType.CreateDocument,

}

export interface RawCreateElementNode {
  tp: MType.CreateElementNode,
  id: number,
  parentID: number,
  index: number,
  tag: string,
  svg: boolean,
}

export interface RawCreateTextNode {
  tp: MType.CreateTextNode,
  id: number,
  parentID: number,
  index: number,
}

export interface RawMoveNode {
  tp: MType.MoveNode,
  id: number,
  parentID: number,
  index: number,
}

export interface RawRemoveNode {
  tp: MType.RemoveNode,
  id: number,
}

export interface RawSetNodeAttribute {
  tp: MType.SetNodeAttribute,
  id: number,
  name: string,
  value: string,
}

export interface RawRemoveNodeAttribute {
  tp: MType.RemoveNodeAttribute,
  id: number,
  name: string,
}

export interface RawSetNodeData {
  tp: MType.SetNodeData,
  id: number,
  data: string,
}

export interface RawSetCssData {
  tp: MType.SetCssData,
  id: number,
  data: string,
}

export interface RawSetNodeScroll {
  tp: MType.SetNodeScroll,
  id: number,
  x: number,
  y: number,
}

export interface RawSetInputValue {
  tp: MType.SetInputValue,
  id: number,
  value: string,
  mask: number,
}

export interface RawSetInputChecked {
  tp: MType.SetInputChecked,
  id: number,
  checked: boolean,
}

export interface RawMouseMove {
  tp: MType.MouseMove,
  x: number,
  y: number,
}

export interface RawNetworkRequestDeprecated {
  tp: MType.NetworkRequestDeprecated,
  type: string,
  method: string,
  url: string,
  request: string,
  response: string,
  status: number,
  timestamp: number,
  duration: number,
}

export interface RawConsoleLog {
  tp: MType.ConsoleLog,
  level: string,
  value: string,
}

export interface RawCssInsertRule {
  tp: MType.CssInsertRule,
  id: number,
  rule: string,
  index: number,
}

export interface RawCssDeleteRule {
  tp: MType.CssDeleteRule,
  id: number,
  index: number,
}

export interface RawFetch {
  tp: MType.Fetch,
  method: string,
  url: string,
  request: string,
  response: string,
  status: number,
  timestamp: number,
  duration: number,
}

export interface RawProfiler {
  tp: MType.Profiler,
  name: string,
  duration: number,
  args: string,
  result: string,
}

export interface RawOTable {
  tp: MType.OTable,
  key: string,
  value: string,
}

export interface RawRedux {
  tp: MType.Redux,
  action: string,
  state: string,
  duration: number,
}

export interface RawVuex {
  tp: MType.Vuex,
  mutation: string,
  state: string,
}

export interface RawMobX {
  tp: MType.MobX,
  type: string,
  payload: string,
}

export interface RawNgRx {
  tp: MType.NgRx,
  action: string,
  state: string,
  duration: number,
}

export interface RawGraphQl {
  tp: MType.GraphQl,
  operationKind: string,
  operationName: string,
  variables: string,
  response: string,
}

export interface RawPerformanceTrack {
  tp: MType.PerformanceTrack,
  frames: number,
  ticks: number,
  totalJSHeapSize: number,
  usedJSHeapSize: number,
}

export interface RawStringDict {
  tp: MType.StringDict,
  key: number,
  value: string,
}

export interface RawSetNodeAttributeDict {
  tp: MType.SetNodeAttributeDict,
  id: number,
  nameKey: number,
  valueKey: number,
}

export interface RawResourceTimingDeprecated {
  tp: MType.ResourceTimingDeprecated,
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
  tp: MType.ConnectionInformation,
  downlink: number,
  type: string,
}

export interface RawSetPageVisibility {
  tp: MType.SetPageVisibility,
  hidden: boolean,
}

export interface RawLoadFontFace {
  tp: MType.LoadFontFace,
  parentID: number,
  family: string,
  source: string,
  descriptors: string,
}

export interface RawSetNodeFocus {
  tp: MType.SetNodeFocus,
  id: number,
}

export interface RawLongTask {
  tp: MType.LongTask,
  timestamp: number,
  duration: number,
  context: number,
  containerType: number,
  containerSrc: string,
  containerId: string,
  containerName: string,
}

export interface RawSetNodeAttributeURLBased {
  tp: MType.SetNodeAttributeURLBased,
  id: number,
  name: string,
  value: string,
  baseURL: string,
}

export interface RawSetCssDataURLBased {
  tp: MType.SetCssDataURLBased,
  id: number,
  data: string,
  baseURL: string,
}

export interface RawCssInsertRuleURLBased {
  tp: MType.CssInsertRuleURLBased,
  id: number,
  rule: string,
  index: number,
  baseURL: string,
}

export interface RawMouseClick {
  tp: MType.MouseClick,
  id: number,
  hesitationTime: number,
  label: string,
  selector: string,
}

export interface RawCreateIFrameDocument {
  tp: MType.CreateIFrameDocument,
  frameID: number,
  id: number,
}

export interface RawAdoptedSsReplaceURLBased {
  tp: MType.AdoptedSsReplaceURLBased,
  sheetID: number,
  text: string,
  baseURL: string,
}

export interface RawAdoptedSsReplace {
  tp: MType.AdoptedSsReplace,
  sheetID: number,
  text: string,
}

export interface RawAdoptedSsInsertRuleURLBased {
  tp: MType.AdoptedSsInsertRuleURLBased,
  sheetID: number,
  rule: string,
  index: number,
  baseURL: string,
}

export interface RawAdoptedSsInsertRule {
  tp: MType.AdoptedSsInsertRule,
  sheetID: number,
  rule: string,
  index: number,
}

export interface RawAdoptedSsDeleteRule {
  tp: MType.AdoptedSsDeleteRule,
  sheetID: number,
  index: number,
}

export interface RawAdoptedSsAddOwner {
  tp: MType.AdoptedSsAddOwner,
  sheetID: number,
  id: number,
}

export interface RawAdoptedSsRemoveOwner {
  tp: MType.AdoptedSsRemoveOwner,
  sheetID: number,
  id: number,
}

export interface RawZustand {
  tp: MType.Zustand,
  mutation: string,
  state: string,
}

export interface RawNetworkRequest {
  tp: MType.NetworkRequest,
  type: string,
  method: string,
  url: string,
  request: string,
  response: string,
  status: number,
  timestamp: number,
  duration: number,
  transferredBodySize: number,
}

export interface RawWsChannel {
  tp: MType.WsChannel,
  chType: string,
  channelName: string,
  data: string,
  timestamp: number,
  dir: string,
  messageType: string,
}

export interface RawSelectionChange {
  tp: MType.SelectionChange,
  selectionStart: number,
  selectionEnd: number,
  selection: string,
}

export interface RawMouseThrashing {
  tp: MType.MouseThrashing,
  timestamp: number,
}

export interface RawResourceTiming {
  tp: MType.ResourceTiming,
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
}

export interface RawTabChange {
  tp: MType.TabChange,
  tabId: string,
}

export interface RawTabData {
  tp: MType.TabData,
  tabId: string,
}

export interface RawCanvasNode {
  tp: MType.CanvasNode,
  nodeId: string,
  timestamp: number,
}

export interface RawTagTrigger {
  tp: MType.TagTrigger,
  tagId: number,
}

export interface RawIosEvent {
  tp: MType.IosEvent,
  timestamp: number,
  length: number,
  name: string,
  payload: string,
}

export interface RawIosScreenChanges {
  tp: MType.IosScreenChanges,
  timestamp: number,
  length: number,
  x: number,
  y: number,
  width: number,
  height: number,
}

export interface RawIosClickEvent {
  tp: MType.IosClickEvent,
  timestamp: number,
  length: number,
  label: string,
  x: number,
  y: number,
}

export interface RawIosInputEvent {
  tp: MType.IosInputEvent,
  timestamp: number,
  length: number,
  value: string,
  valueMasked: boolean,
  label: string,
}

export interface RawIosPerformanceEvent {
  tp: MType.IosPerformanceEvent,
  timestamp: number,
  length: number,
  name: string,
  value: number,
}

export interface RawIosLog {
  tp: MType.IosLog,
  timestamp: number,
  length: number,
  severity: string,
  content: string,
}

export interface RawIosInternalError {
  tp: MType.IosInternalError,
  timestamp: number,
  length: number,
  content: string,
}

export interface RawIosNetworkCall {
  tp: MType.IosNetworkCall,
  timestamp: number,
  length: number,
  type: string,
  method: string,
  url: string,
  request: string,
  response: string,
  status: number,
  duration: number,
}

export interface RawIosSwipeEvent {
  tp: MType.IosSwipeEvent,
  timestamp: number,
  length: number,
  label: string,
  x: number,
  y: number,
  direction: string,
}

export interface RawIosIssueEvent {
  tp: MType.IosIssueEvent,
  timestamp: number,
  type: string,
  contextString: string,
  context: string,
  payload: string,
}


export type RawMessage = RawTimestamp | RawSetPageLocation | RawSetViewportSize | RawSetViewportScroll | RawCreateDocument | RawCreateElementNode | RawCreateTextNode | RawMoveNode | RawRemoveNode | RawSetNodeAttribute | RawRemoveNodeAttribute | RawSetNodeData | RawSetCssData | RawSetNodeScroll | RawSetInputValue | RawSetInputChecked | RawMouseMove | RawNetworkRequestDeprecated | RawConsoleLog | RawCssInsertRule | RawCssDeleteRule | RawFetch | RawProfiler | RawOTable | RawRedux | RawVuex | RawMobX | RawNgRx | RawGraphQl | RawPerformanceTrack | RawStringDict | RawSetNodeAttributeDict | RawResourceTimingDeprecated | RawConnectionInformation | RawSetPageVisibility | RawLoadFontFace | RawSetNodeFocus | RawLongTask | RawSetNodeAttributeURLBased | RawSetCssDataURLBased | RawCssInsertRuleURLBased | RawMouseClick | RawCreateIFrameDocument | RawAdoptedSsReplaceURLBased | RawAdoptedSsReplace | RawAdoptedSsInsertRuleURLBased | RawAdoptedSsInsertRule | RawAdoptedSsDeleteRule | RawAdoptedSsAddOwner | RawAdoptedSsRemoveOwner | RawZustand | RawNetworkRequest | RawWsChannel | RawSelectionChange | RawMouseThrashing | RawResourceTiming | RawTabChange | RawTabData | RawCanvasNode | RawTagTrigger | RawIosEvent | RawIosScreenChanges | RawIosClickEvent | RawIosInputEvent | RawIosPerformanceEvent | RawIosLog | RawIosInternalError | RawIosNetworkCall | RawIosSwipeEvent | RawIosIssueEvent;
