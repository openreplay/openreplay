// Auto-generated, do not edit
/* eslint-disable */

export declare const enum Type {
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
  SetNodeScroll = 16,
  SetInputTarget = 17,
  SetInputValue = 18,
  SetInputChecked = 19,
  MouseMove = 20,
  NetworkRequestDeprecated = 21,
  ConsoleLog = 22,
  PageLoadTiming = 23,
  PageRenderTiming = 24,
  CustomEvent = 27,
  UserID = 28,
  UserAnonymousID = 29,
  Metadata = 30,
  CSSInsertRule = 37,
  CSSDeleteRule = 38,
  Fetch = 39,
  Profiler = 40,
  OTable = 41,
  StateAction = 42,
  Redux = 44,
  Vuex = 45,
  MobX = 46,
  NgRx = 47,
  GraphQL = 48,
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
  SetCSSDataURLBased = 61,
  TechnicalInfo = 63,
  CustomIssue = 64,
  CSSInsertRuleURLBased = 67,
  MouseClick = 69,
  CreateIFrameDocument = 70,
  AdoptedSSReplaceURLBased = 71,
  AdoptedSSInsertRuleURLBased = 73,
  AdoptedSSDeleteRule = 75,
  AdoptedSSAddOwner = 76,
  AdoptedSSRemoveOwner = 77,
  JSException = 78,
  Zustand = 79,
  BatchMetadata = 81,
  PartitionedMessage = 82,
  NetworkRequest = 83,
  WSChannel = 84,
  InputChange = 112,
  SelectionChange = 113,
  MouseThrashing = 114,
  UnbindNodes = 115,
  ResourceTiming = 116,
  TabChange = 117,
  TabData = 118,
  CanvasNode = 119,
  TagTrigger = 120,
}


export type Timestamp = [
  /*type:*/ Type.Timestamp,
  /*timestamp:*/ number,
]

export type SetPageLocation = [
  /*type:*/ Type.SetPageLocation,
  /*url:*/ string,
  /*referrer:*/ string,
  /*navigationStart:*/ number,
]

export type SetViewportSize = [
  /*type:*/ Type.SetViewportSize,
  /*width:*/ number,
  /*height:*/ number,
]

export type SetViewportScroll = [
  /*type:*/ Type.SetViewportScroll,
  /*x:*/ number,
  /*y:*/ number,
]

export type CreateDocument = [
  /*type:*/ Type.CreateDocument,
  
]

export type CreateElementNode = [
  /*type:*/ Type.CreateElementNode,
  /*id:*/ number,
  /*parentID:*/ number,
  /*index:*/ number,
  /*tag:*/ string,
  /*svg:*/ boolean,
]

export type CreateTextNode = [
  /*type:*/ Type.CreateTextNode,
  /*id:*/ number,
  /*parentID:*/ number,
  /*index:*/ number,
]

export type MoveNode = [
  /*type:*/ Type.MoveNode,
  /*id:*/ number,
  /*parentID:*/ number,
  /*index:*/ number,
]

export type RemoveNode = [
  /*type:*/ Type.RemoveNode,
  /*id:*/ number,
]

export type SetNodeAttribute = [
  /*type:*/ Type.SetNodeAttribute,
  /*id:*/ number,
  /*name:*/ string,
  /*value:*/ string,
]

export type RemoveNodeAttribute = [
  /*type:*/ Type.RemoveNodeAttribute,
  /*id:*/ number,
  /*name:*/ string,
]

export type SetNodeData = [
  /*type:*/ Type.SetNodeData,
  /*id:*/ number,
  /*data:*/ string,
]

export type SetNodeScroll = [
  /*type:*/ Type.SetNodeScroll,
  /*id:*/ number,
  /*x:*/ number,
  /*y:*/ number,
]

export type SetInputTarget = [
  /*type:*/ Type.SetInputTarget,
  /*id:*/ number,
  /*label:*/ string,
]

export type SetInputValue = [
  /*type:*/ Type.SetInputValue,
  /*id:*/ number,
  /*value:*/ string,
  /*mask:*/ number,
]

export type SetInputChecked = [
  /*type:*/ Type.SetInputChecked,
  /*id:*/ number,
  /*checked:*/ boolean,
]

export type MouseMove = [
  /*type:*/ Type.MouseMove,
  /*x:*/ number,
  /*y:*/ number,
]

export type NetworkRequestDeprecated = [
  /*type:*/ Type.NetworkRequestDeprecated,
  /*type:*/ string,
  /*method:*/ string,
  /*url:*/ string,
  /*request:*/ string,
  /*response:*/ string,
  /*status:*/ number,
  /*timestamp:*/ number,
  /*duration:*/ number,
]

export type ConsoleLog = [
  /*type:*/ Type.ConsoleLog,
  /*level:*/ string,
  /*value:*/ string,
]

export type PageLoadTiming = [
  /*type:*/ Type.PageLoadTiming,
  /*requestStart:*/ number,
  /*responseStart:*/ number,
  /*responseEnd:*/ number,
  /*domContentLoadedEventStart:*/ number,
  /*domContentLoadedEventEnd:*/ number,
  /*loadEventStart:*/ number,
  /*loadEventEnd:*/ number,
  /*firstPaint:*/ number,
  /*firstContentfulPaint:*/ number,
]

export type PageRenderTiming = [
  /*type:*/ Type.PageRenderTiming,
  /*speedIndex:*/ number,
  /*visuallyComplete:*/ number,
  /*timeToInteractive:*/ number,
]

export type CustomEvent = [
  /*type:*/ Type.CustomEvent,
  /*name:*/ string,
  /*payload:*/ string,
]

export type UserID = [
  /*type:*/ Type.UserID,
  /*id:*/ string,
]

export type UserAnonymousID = [
  /*type:*/ Type.UserAnonymousID,
  /*id:*/ string,
]

export type Metadata = [
  /*type:*/ Type.Metadata,
  /*key:*/ string,
  /*value:*/ string,
]

export type CSSInsertRule = [
  /*type:*/ Type.CSSInsertRule,
  /*id:*/ number,
  /*rule:*/ string,
  /*index:*/ number,
]

export type CSSDeleteRule = [
  /*type:*/ Type.CSSDeleteRule,
  /*id:*/ number,
  /*index:*/ number,
]

export type Fetch = [
  /*type:*/ Type.Fetch,
  /*method:*/ string,
  /*url:*/ string,
  /*request:*/ string,
  /*response:*/ string,
  /*status:*/ number,
  /*timestamp:*/ number,
  /*duration:*/ number,
]

export type Profiler = [
  /*type:*/ Type.Profiler,
  /*name:*/ string,
  /*duration:*/ number,
  /*args:*/ string,
  /*result:*/ string,
]

export type OTable = [
  /*type:*/ Type.OTable,
  /*key:*/ string,
  /*value:*/ string,
]

export type StateAction = [
  /*type:*/ Type.StateAction,
  /*type:*/ string,
]

export type Redux = [
  /*type:*/ Type.Redux,
  /*action:*/ string,
  /*state:*/ string,
  /*duration:*/ number,
]

export type Vuex = [
  /*type:*/ Type.Vuex,
  /*mutation:*/ string,
  /*state:*/ string,
]

export type MobX = [
  /*type:*/ Type.MobX,
  /*type:*/ string,
  /*payload:*/ string,
]

export type NgRx = [
  /*type:*/ Type.NgRx,
  /*action:*/ string,
  /*state:*/ string,
  /*duration:*/ number,
]

export type GraphQL = [
  /*type:*/ Type.GraphQL,
  /*operationKind:*/ string,
  /*operationName:*/ string,
  /*variables:*/ string,
  /*response:*/ string,
]

export type PerformanceTrack = [
  /*type:*/ Type.PerformanceTrack,
  /*frames:*/ number,
  /*ticks:*/ number,
  /*totalJSHeapSize:*/ number,
  /*usedJSHeapSize:*/ number,
]

export type StringDict = [
  /*type:*/ Type.StringDict,
  /*key:*/ number,
  /*value:*/ string,
]

export type SetNodeAttributeDict = [
  /*type:*/ Type.SetNodeAttributeDict,
  /*id:*/ number,
  /*nameKey:*/ number,
  /*valueKey:*/ number,
]

export type ResourceTimingDeprecated = [
  /*type:*/ Type.ResourceTimingDeprecated,
  /*timestamp:*/ number,
  /*duration:*/ number,
  /*ttfb:*/ number,
  /*headerSize:*/ number,
  /*encodedBodySize:*/ number,
  /*decodedBodySize:*/ number,
  /*url:*/ string,
  /*initiator:*/ string,
]

export type ConnectionInformation = [
  /*type:*/ Type.ConnectionInformation,
  /*downlink:*/ number,
  /*type:*/ string,
]

export type SetPageVisibility = [
  /*type:*/ Type.SetPageVisibility,
  /*hidden:*/ boolean,
]

export type LoadFontFace = [
  /*type:*/ Type.LoadFontFace,
  /*parentID:*/ number,
  /*family:*/ string,
  /*source:*/ string,
  /*descriptors:*/ string,
]

export type SetNodeFocus = [
  /*type:*/ Type.SetNodeFocus,
  /*id:*/ number,
]

export type LongTask = [
  /*type:*/ Type.LongTask,
  /*timestamp:*/ number,
  /*duration:*/ number,
  /*context:*/ number,
  /*containerType:*/ number,
  /*containerSrc:*/ string,
  /*containerId:*/ string,
  /*containerName:*/ string,
]

export type SetNodeAttributeURLBased = [
  /*type:*/ Type.SetNodeAttributeURLBased,
  /*id:*/ number,
  /*name:*/ string,
  /*value:*/ string,
  /*baseURL:*/ string,
]

export type SetCSSDataURLBased = [
  /*type:*/ Type.SetCSSDataURLBased,
  /*id:*/ number,
  /*data:*/ string,
  /*baseURL:*/ string,
]

export type TechnicalInfo = [
  /*type:*/ Type.TechnicalInfo,
  /*type:*/ string,
  /*value:*/ string,
]

export type CustomIssue = [
  /*type:*/ Type.CustomIssue,
  /*name:*/ string,
  /*payload:*/ string,
]

export type CSSInsertRuleURLBased = [
  /*type:*/ Type.CSSInsertRuleURLBased,
  /*id:*/ number,
  /*rule:*/ string,
  /*index:*/ number,
  /*baseURL:*/ string,
]

export type MouseClick = [
  /*type:*/ Type.MouseClick,
  /*id:*/ number,
  /*hesitationTime:*/ number,
  /*label:*/ string,
  /*selector:*/ string,
]

export type CreateIFrameDocument = [
  /*type:*/ Type.CreateIFrameDocument,
  /*frameID:*/ number,
  /*id:*/ number,
]

export type AdoptedSSReplaceURLBased = [
  /*type:*/ Type.AdoptedSSReplaceURLBased,
  /*sheetID:*/ number,
  /*text:*/ string,
  /*baseURL:*/ string,
]

export type AdoptedSSInsertRuleURLBased = [
  /*type:*/ Type.AdoptedSSInsertRuleURLBased,
  /*sheetID:*/ number,
  /*rule:*/ string,
  /*index:*/ number,
  /*baseURL:*/ string,
]

export type AdoptedSSDeleteRule = [
  /*type:*/ Type.AdoptedSSDeleteRule,
  /*sheetID:*/ number,
  /*index:*/ number,
]

export type AdoptedSSAddOwner = [
  /*type:*/ Type.AdoptedSSAddOwner,
  /*sheetID:*/ number,
  /*id:*/ number,
]

export type AdoptedSSRemoveOwner = [
  /*type:*/ Type.AdoptedSSRemoveOwner,
  /*sheetID:*/ number,
  /*id:*/ number,
]

export type JSException = [
  /*type:*/ Type.JSException,
  /*name:*/ string,
  /*message:*/ string,
  /*payload:*/ string,
  /*metadata:*/ string,
]

export type Zustand = [
  /*type:*/ Type.Zustand,
  /*mutation:*/ string,
  /*state:*/ string,
]

export type BatchMetadata = [
  /*type:*/ Type.BatchMetadata,
  /*version:*/ number,
  /*pageNo:*/ number,
  /*firstIndex:*/ number,
  /*timestamp:*/ number,
  /*location:*/ string,
]

export type PartitionedMessage = [
  /*type:*/ Type.PartitionedMessage,
  /*partNo:*/ number,
  /*partTotal:*/ number,
]

export type NetworkRequest = [
  /*type:*/ Type.NetworkRequest,
  /*type:*/ string,
  /*method:*/ string,
  /*url:*/ string,
  /*request:*/ string,
  /*response:*/ string,
  /*status:*/ number,
  /*timestamp:*/ number,
  /*duration:*/ number,
  /*transferredBodySize:*/ number,
]

export type WSChannel = [
  /*type:*/ Type.WSChannel,
  /*chType:*/ string,
  /*channelName:*/ string,
  /*data:*/ string,
  /*timestamp:*/ number,
  /*dir:*/ string,
  /*messageType:*/ string,
]

export type InputChange = [
  /*type:*/ Type.InputChange,
  /*id:*/ number,
  /*value:*/ string,
  /*valueMasked:*/ boolean,
  /*label:*/ string,
  /*hesitationTime:*/ number,
  /*inputDuration:*/ number,
]

export type SelectionChange = [
  /*type:*/ Type.SelectionChange,
  /*selectionStart:*/ number,
  /*selectionEnd:*/ number,
  /*selection:*/ string,
]

export type MouseThrashing = [
  /*type:*/ Type.MouseThrashing,
  /*timestamp:*/ number,
]

export type UnbindNodes = [
  /*type:*/ Type.UnbindNodes,
  /*totalRemovedPercent:*/ number,
]

export type ResourceTiming = [
  /*type:*/ Type.ResourceTiming,
  /*timestamp:*/ number,
  /*duration:*/ number,
  /*ttfb:*/ number,
  /*headerSize:*/ number,
  /*encodedBodySize:*/ number,
  /*decodedBodySize:*/ number,
  /*url:*/ string,
  /*initiator:*/ string,
  /*transferredSize:*/ number,
  /*cached:*/ boolean,
]

export type TabChange = [
  /*type:*/ Type.TabChange,
  /*tabId:*/ string,
]

export type TabData = [
  /*type:*/ Type.TabData,
  /*tabId:*/ string,
]

export type CanvasNode = [
  /*type:*/ Type.CanvasNode,
  /*nodeId:*/ string,
  /*timestamp:*/ number,
]

export type TagTrigger = [
  /*type:*/ Type.TagTrigger,
  /*tagId:*/ number,
]


type Message =  Timestamp | SetPageLocation | SetViewportSize | SetViewportScroll | CreateDocument | CreateElementNode | CreateTextNode | MoveNode | RemoveNode | SetNodeAttribute | RemoveNodeAttribute | SetNodeData | SetNodeScroll | SetInputTarget | SetInputValue | SetInputChecked | MouseMove | NetworkRequestDeprecated | ConsoleLog | PageLoadTiming | PageRenderTiming | CustomEvent | UserID | UserAnonymousID | Metadata | CSSInsertRule | CSSDeleteRule | Fetch | Profiler | OTable | StateAction | Redux | Vuex | MobX | NgRx | GraphQL | PerformanceTrack | StringDict | SetNodeAttributeDict | ResourceTimingDeprecated | ConnectionInformation | SetPageVisibility | LoadFontFace | SetNodeFocus | LongTask | SetNodeAttributeURLBased | SetCSSDataURLBased | TechnicalInfo | CustomIssue | CSSInsertRuleURLBased | MouseClick | CreateIFrameDocument | AdoptedSSReplaceURLBased | AdoptedSSInsertRuleURLBased | AdoptedSSDeleteRule | AdoptedSSAddOwner | AdoptedSSRemoveOwner | JSException | Zustand | BatchMetadata | PartitionedMessage | NetworkRequest | WSChannel | InputChange | SelectionChange | MouseThrashing | UnbindNodes | ResourceTiming | TabChange | TabData | CanvasNode | TagTrigger
export default Message
