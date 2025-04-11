// Auto-generated, do not edit

export const enum MType {
  Timestamp = 0,
  SetPageLocationDeprecated = 4,
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
  StringDictGlobal = 34,
  SetNodeAttributeDictGlobal = 35,
  Profiler = 40,
  OTable = 41,
  ReduxDeprecated = 44,
  Vuex = 45,
  MobX = 46,
  NgRx = 47,
  GraphQlDeprecated = 48,
  PerformanceTrack = 49,
  StringDictDeprecated = 50,
  SetNodeAttributeDictDeprecated = 51,
  StringDict = 43,
  SetNodeAttributeDict = 52,
  ResourceTimingDeprecated = 53,
  ConnectionInformation = 54,
  SetPageVisibility = 55,
  LoadFontFace = 57,
  SetNodeFocus = 58,
  SetNodeAttributeURLBased = 60,
  SetCssDataURLBased = 61,
  MouseClick = 68,
  MouseClickDeprecated = 69,
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
  Redux = 121,
  SetPageLocation = 122,
  GraphQl = 123,
  MobileEvent = 93,
  MobileScreenChanges = 96,
  MobileClickEvent = 100,
  MobileInputEvent = 101,
  MobilePerformanceEvent = 102,
  MobileLog = 103,
  MobileInternalError = 104,
  MobileNetworkCall = 105,
  MobileSwipeEvent = 106,
  MobileIssueEvent = 111,
}

export interface RawTimestamp {
  tp: MType.Timestamp;
  timestamp: number;
}

export interface RawSetPageLocationDeprecated {
  tp: MType.SetPageLocationDeprecated;
  url: string;
  referrer: string;
  navigationStart: number;
}

export interface RawSetViewportSize {
  tp: MType.SetViewportSize;
  width: number;
  height: number;
}

export interface RawSetViewportScroll {
  tp: MType.SetViewportScroll;
  x: number;
  y: number;
}

export interface RawCreateDocument {
  tp: MType.CreateDocument;
}

export interface RawCreateElementNode {
  tp: MType.CreateElementNode;
  id: number;
  parentID: number;
  index: number;
  tag: string;
  svg: boolean;
}

export interface RawCreateTextNode {
  tp: MType.CreateTextNode;
  id: number;
  parentID: number;
  index: number;
}

export interface RawMoveNode {
  tp: MType.MoveNode;
  id: number;
  parentID: number;
  index: number;
}

export interface RawRemoveNode {
  tp: MType.RemoveNode;
  id: number;
}

export interface RawSetNodeAttribute {
  tp: MType.SetNodeAttribute;
  id: number;
  name: string;
  value: string;
}

export interface RawRemoveNodeAttribute {
  tp: MType.RemoveNodeAttribute;
  id: number;
  name: string;
}

export interface RawSetNodeData {
  tp: MType.SetNodeData;
  id: number;
  data: string;
}

export interface RawSetCssData {
  tp: MType.SetCssData;
  id: number;
  data: string;
}

export interface RawSetNodeScroll {
  tp: MType.SetNodeScroll;
  id: number;
  x: number;
  y: number;
}

export interface RawSetInputValue {
  tp: MType.SetInputValue;
  id: number;
  value: string;
  mask: number;
}

export interface RawSetInputChecked {
  tp: MType.SetInputChecked;
  id: number;
  checked: boolean;
}

export interface RawMouseMove {
  tp: MType.MouseMove;
  x: number;
  y: number;
}

export interface RawNetworkRequestDeprecated {
  tp: MType.NetworkRequestDeprecated;
  type: string;
  method: string;
  url: string;
  request: string;
  response: string;
  status: number;
  timestamp: number;
  duration: number;
}

export interface RawConsoleLog {
  tp: MType.ConsoleLog;
  level: string;
  value: string;
}

export interface RawStringDictGlobal {
  tp: MType.StringDictGlobal;
  key: number;
  value: string;
}

export interface RawSetNodeAttributeDictGlobal {
  tp: MType.SetNodeAttributeDictGlobal;
  id: number;
  name: number;
  value: number;
}

export interface RawProfiler {
  tp: MType.Profiler;
  name: string;
  duration: number;
  args: string;
  result: string;
}

export interface RawOTable {
  tp: MType.OTable;
  key: string;
  value: string;
}

export interface RawReduxDeprecated {
  tp: MType.ReduxDeprecated;
  action: string;
  state: string;
  duration: number;
}

export interface RawVuex {
  tp: MType.Vuex;
  mutation: string;
  state: string;
}

export interface RawMobX {
  tp: MType.MobX;
  type: string;
  payload: string;
}

export interface RawNgRx {
  tp: MType.NgRx;
  action: string;
  state: string;
  duration: number;
}

export interface RawGraphQlDeprecated {
  tp: MType.GraphQlDeprecated;
  operationKind: string;
  operationName: string;
  variables: string;
  response: string;
  duration: number;
}

export interface RawPerformanceTrack {
  tp: MType.PerformanceTrack;
  frames: number;
  ticks: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

export interface RawStringDictDeprecated {
  tp: MType.StringDictDeprecated;
  key: number;
  value: string;
}

export interface RawSetNodeAttributeDictDeprecated {
  tp: MType.SetNodeAttributeDictDeprecated;
  id: number;
  nameKey: number;
  valueKey: number;
}

export interface RawStringDict {
  tp: MType.StringDict;
  key: string;
  value: string;
}

export interface RawSetNodeAttributeDict {
  tp: MType.SetNodeAttributeDict;
  id: number;
  name: string;
  value: string;
}

export interface RawResourceTimingDeprecated {
  tp: MType.ResourceTimingDeprecated;
  timestamp: number;
  duration: number;
  ttfb: number;
  headerSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  url: string;
  initiator: string;
}

export interface RawConnectionInformation {
  tp: MType.ConnectionInformation;
  downlink: number;
  type: string;
}

export interface RawSetPageVisibility {
  tp: MType.SetPageVisibility;
  hidden: boolean;
}

export interface RawLoadFontFace {
  tp: MType.LoadFontFace;
  parentID: number;
  family: string;
  source: string;
  descriptors: string;
}

export interface RawSetNodeFocus {
  tp: MType.SetNodeFocus;
  id: number;
}

export interface RawSetNodeAttributeURLBased {
  tp: MType.SetNodeAttributeURLBased;
  id: number;
  name: string;
  value: string;
  baseURL: string;
}

export interface RawSetCssDataURLBased {
  tp: MType.SetCssDataURLBased;
  id: number;
  data: string;
  baseURL: string;
}

export interface RawMouseClick {
  tp: MType.MouseClick;
  id: number;
  hesitationTime: number;
  label: string;
  selector: string;
  normalizedX: number;
  normalizedY: number;
}

export interface RawMouseClickDeprecated {
  tp: MType.MouseClickDeprecated;
  id: number;
  hesitationTime: number;
  label: string;
  selector: string;
}

export interface RawCreateIFrameDocument {
  tp: MType.CreateIFrameDocument;
  frameID: number;
  id: number;
}

export interface RawAdoptedSsReplaceURLBased {
  tp: MType.AdoptedSsReplaceURLBased;
  sheetID: number;
  text: string;
  baseURL: string;
}

export interface RawAdoptedSsReplace {
  tp: MType.AdoptedSsReplace;
  sheetID: number;
  text: string;
}

export interface RawAdoptedSsInsertRuleURLBased {
  tp: MType.AdoptedSsInsertRuleURLBased;
  sheetID: number;
  rule: string;
  index: number;
  baseURL: string;
}

export interface RawAdoptedSsInsertRule {
  tp: MType.AdoptedSsInsertRule;
  sheetID: number;
  rule: string;
  index: number;
}

export interface RawAdoptedSsDeleteRule {
  tp: MType.AdoptedSsDeleteRule;
  sheetID: number;
  index: number;
}

export interface RawAdoptedSsAddOwner {
  tp: MType.AdoptedSsAddOwner;
  sheetID: number;
  id: number;
}

export interface RawAdoptedSsRemoveOwner {
  tp: MType.AdoptedSsRemoveOwner;
  sheetID: number;
  id: number;
}

export interface RawZustand {
  tp: MType.Zustand;
  mutation: string;
  state: string;
}

export interface RawNetworkRequest {
  tp: MType.NetworkRequest;
  type: string;
  method: string;
  url: string;
  request: string;
  response: string;
  status: number;
  timestamp: number;
  duration: number;
  transferredBodySize: number;
}

export interface RawWsChannel {
  tp: MType.WsChannel;
  chType: string;
  channelName: string;
  data: string;
  timestamp: number;
  dir: string;
  messageType: string;
}

export interface RawSelectionChange {
  tp: MType.SelectionChange;
  selectionStart: number;
  selectionEnd: number;
  selection: string;
}

export interface RawMouseThrashing {
  tp: MType.MouseThrashing;
  timestamp: number;
}

export interface RawResourceTiming {
  tp: MType.ResourceTiming;
  timestamp: number;
  duration: number;
  ttfb: number;
  headerSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  url: string;
  initiator: string;
  transferredSize: number;
  cached: boolean;
}

export interface RawTabChange {
  tp: MType.TabChange;
  tabId: string;
}

export interface RawTabData {
  tp: MType.TabData;
  tabId: string;
}

export interface RawCanvasNode {
  tp: MType.CanvasNode;
  nodeId: string;
  timestamp: number;
}

export interface RawTagTrigger {
  tp: MType.TagTrigger;
  tagId: number;
}

export interface RawRedux {
  tp: MType.Redux;
  action: string;
  state: string;
  duration: number;
  actionTime: number;
}

export interface RawSetPageLocation {
  tp: MType.SetPageLocation;
  url: string;
  referrer: string;
  navigationStart: number;
  documentTitle: string;
}

export interface RawGraphQl {
  tp: MType.GraphQl;
  operationKind: string;
  operationName: string;
  variables: string;
  response: string;
  duration: number;
}

export interface RawMobileEvent {
  tp: MType.MobileEvent;
  timestamp: number;
  length: number;
  name: string;
  payload: string;
}

export interface RawMobileScreenChanges {
  tp: MType.MobileScreenChanges;
  timestamp: number;
  length: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RawMobileClickEvent {
  tp: MType.MobileClickEvent;
  timestamp: number;
  length: number;
  label: string;
  x: number;
  y: number;
}

export interface RawMobileInputEvent {
  tp: MType.MobileInputEvent;
  timestamp: number;
  length: number;
  value: string;
  valueMasked: boolean;
  label: string;
}

export interface RawMobilePerformanceEvent {
  tp: MType.MobilePerformanceEvent;
  timestamp: number;
  length: number;
  name: string;
  value: number;
}

export interface RawMobileLog {
  tp: MType.MobileLog;
  timestamp: number;
  length: number;
  severity: string;
  content: string;
}

export interface RawMobileInternalError {
  tp: MType.MobileInternalError;
  timestamp: number;
  length: number;
  content: string;
}

export interface RawMobileNetworkCall {
  tp: MType.MobileNetworkCall;
  timestamp: number;
  length: number;
  type: string;
  method: string;
  url: string;
  request: string;
  response: string;
  status: number;
  duration: number;
}

export interface RawMobileSwipeEvent {
  tp: MType.MobileSwipeEvent;
  timestamp: number;
  length: number;
  label: string;
  x: number;
  y: number;
  direction: string;
}

export interface RawMobileIssueEvent {
  tp: MType.MobileIssueEvent;
  timestamp: number;
  type: string;
  contextString: string;
  context: string;
  payload: string;
}


export type RawMessage = RawTimestamp | RawSetPageLocationDeprecated | RawSetViewportSize | RawSetViewportScroll | RawCreateDocument | RawCreateElementNode | RawCreateTextNode | RawMoveNode | RawRemoveNode | RawSetNodeAttribute | RawRemoveNodeAttribute | RawSetNodeData | RawSetCssData | RawSetNodeScroll | RawSetInputValue | RawSetInputChecked | RawMouseMove | RawNetworkRequestDeprecated | RawConsoleLog | RawStringDictGlobal | RawSetNodeAttributeDictGlobal | RawProfiler | RawOTable | RawReduxDeprecated | RawVuex | RawMobX | RawNgRx | RawGraphQlDeprecated | RawPerformanceTrack | RawStringDictDeprecated | RawSetNodeAttributeDictDeprecated | RawStringDict | RawSetNodeAttributeDict | RawResourceTimingDeprecated | RawConnectionInformation | RawSetPageVisibility | RawLoadFontFace | RawSetNodeFocus | RawSetNodeAttributeURLBased | RawSetCssDataURLBased | RawMouseClick | RawMouseClickDeprecated | RawCreateIFrameDocument | RawAdoptedSsReplaceURLBased | RawAdoptedSsReplace | RawAdoptedSsInsertRuleURLBased | RawAdoptedSsInsertRule | RawAdoptedSsDeleteRule | RawAdoptedSsAddOwner | RawAdoptedSsRemoveOwner | RawZustand | RawNetworkRequest | RawWsChannel | RawSelectionChange | RawMouseThrashing | RawResourceTiming | RawTabChange | RawTabData | RawCanvasNode | RawTagTrigger | RawRedux | RawSetPageLocation | RawGraphQl | RawMobileEvent | RawMobileScreenChanges | RawMobileClickEvent | RawMobileInputEvent | RawMobilePerformanceEvent | RawMobileLog | RawMobileInternalError | RawMobileNetworkCall | RawMobileSwipeEvent | RawMobileIssueEvent;
