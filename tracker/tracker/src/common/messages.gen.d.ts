export declare const enum Type {
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
    ReduxDeprecated = 44,
    Vuex = 45,
    MobX = 46,
    NgRx = 47,
    GraphQLDeprecated = 48,
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
    LongTask = 59,
    SetNodeAttributeURLBased = 60,
    SetCSSDataURLBased = 61,
    TechnicalInfo = 63,
    CustomIssue = 64,
    CSSInsertRuleURLBased = 67,
    MouseClick = 68,
    MouseClickDeprecated = 69,
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
    Redux = 121,
    SetPageLocation = 122,
    GraphQL = 123,
    WebVitals = 124
}
export type Timestamp = [
    Type.Timestamp,
    number
];
export type SetPageLocationDeprecated = [
    Type.SetPageLocationDeprecated,
    string,
    string,
    number
];
export type SetViewportSize = [
    Type.SetViewportSize,
    number,
    number
];
export type SetViewportScroll = [
    Type.SetViewportScroll,
    number,
    number
];
export type CreateDocument = [
    Type.CreateDocument
];
export type CreateElementNode = [
    Type.CreateElementNode,
    number,
    number,
    number,
    string,
    boolean
];
export type CreateTextNode = [
    Type.CreateTextNode,
    number,
    number,
    number
];
export type MoveNode = [
    Type.MoveNode,
    number,
    number,
    number
];
export type RemoveNode = [
    Type.RemoveNode,
    number
];
export type SetNodeAttribute = [
    Type.SetNodeAttribute,
    number,
    string,
    string
];
export type RemoveNodeAttribute = [
    Type.RemoveNodeAttribute,
    number,
    string
];
export type SetNodeData = [
    Type.SetNodeData,
    number,
    string
];
export type SetNodeScroll = [
    Type.SetNodeScroll,
    number,
    number,
    number
];
export type SetInputTarget = [
    Type.SetInputTarget,
    number,
    string
];
export type SetInputValue = [
    Type.SetInputValue,
    number,
    string,
    number
];
export type SetInputChecked = [
    Type.SetInputChecked,
    number,
    boolean
];
export type MouseMove = [
    Type.MouseMove,
    number,
    number
];
export type NetworkRequestDeprecated = [
    Type.NetworkRequestDeprecated,
    string,
    string,
    string,
    string,
    string,
    number,
    number,
    number
];
export type ConsoleLog = [
    Type.ConsoleLog,
    string,
    string
];
export type PageLoadTiming = [
    Type.PageLoadTiming,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
];
export type PageRenderTiming = [
    Type.PageRenderTiming,
    number,
    number,
    number
];
export type CustomEvent = [
    Type.CustomEvent,
    string,
    string
];
export type UserID = [
    Type.UserID,
    string
];
export type UserAnonymousID = [
    Type.UserAnonymousID,
    string
];
export type Metadata = [
    Type.Metadata,
    string,
    string
];
export type CSSInsertRule = [
    Type.CSSInsertRule,
    number,
    string,
    number
];
export type CSSDeleteRule = [
    Type.CSSDeleteRule,
    number,
    number
];
export type Fetch = [
    Type.Fetch,
    string,
    string,
    string,
    string,
    number,
    number,
    number
];
export type Profiler = [
    Type.Profiler,
    string,
    number,
    string,
    string
];
export type OTable = [
    Type.OTable,
    string,
    string
];
export type StateAction = [
    Type.StateAction,
    string
];
export type ReduxDeprecated = [
    Type.ReduxDeprecated,
    string,
    string,
    number
];
export type Vuex = [
    Type.Vuex,
    string,
    string
];
export type MobX = [
    Type.MobX,
    string,
    string
];
export type NgRx = [
    Type.NgRx,
    string,
    string,
    number
];
export type GraphQLDeprecated = [
    Type.GraphQLDeprecated,
    string,
    string,
    string,
    string,
    number
];
export type PerformanceTrack = [
    Type.PerformanceTrack,
    number,
    number,
    number,
    number
];
export type StringDictDeprecated = [
    Type.StringDictDeprecated,
    number,
    string
];
export type SetNodeAttributeDictDeprecated = [
    Type.SetNodeAttributeDictDeprecated,
    number,
    number,
    number
];
export type StringDict = [
    Type.StringDict,
    string,
    string
];
export type SetNodeAttributeDict = [
    Type.SetNodeAttributeDict,
    number,
    string,
    string
];
export type ResourceTimingDeprecated = [
    Type.ResourceTimingDeprecated,
    number,
    number,
    number,
    number,
    number,
    number,
    string,
    string
];
export type ConnectionInformation = [
    Type.ConnectionInformation,
    number,
    string
];
export type SetPageVisibility = [
    Type.SetPageVisibility,
    boolean
];
export type LoadFontFace = [
    Type.LoadFontFace,
    number,
    string,
    string,
    string
];
export type SetNodeFocus = [
    Type.SetNodeFocus,
    number
];
export type LongTask = [
    Type.LongTask,
    number,
    number,
    number,
    number,
    string,
    string,
    string
];
export type SetNodeAttributeURLBased = [
    Type.SetNodeAttributeURLBased,
    number,
    string,
    string,
    string
];
export type SetCSSDataURLBased = [
    Type.SetCSSDataURLBased,
    number,
    string,
    string
];
export type TechnicalInfo = [
    Type.TechnicalInfo,
    string,
    string
];
export type CustomIssue = [
    Type.CustomIssue,
    string,
    string
];
export type CSSInsertRuleURLBased = [
    Type.CSSInsertRuleURLBased,
    number,
    string,
    number,
    string
];
export type MouseClick = [
    Type.MouseClick,
    number,
    number,
    string,
    string,
    number,
    number
];
export type MouseClickDeprecated = [
    Type.MouseClickDeprecated,
    number,
    number,
    string,
    string
];
export type CreateIFrameDocument = [
    Type.CreateIFrameDocument,
    number,
    number
];
export type AdoptedSSReplaceURLBased = [
    Type.AdoptedSSReplaceURLBased,
    number,
    string,
    string
];
export type AdoptedSSInsertRuleURLBased = [
    Type.AdoptedSSInsertRuleURLBased,
    number,
    string,
    number,
    string
];
export type AdoptedSSDeleteRule = [
    Type.AdoptedSSDeleteRule,
    number,
    number
];
export type AdoptedSSAddOwner = [
    Type.AdoptedSSAddOwner,
    number,
    number
];
export type AdoptedSSRemoveOwner = [
    Type.AdoptedSSRemoveOwner,
    number,
    number
];
export type JSException = [
    Type.JSException,
    string,
    string,
    string,
    string
];
export type Zustand = [
    Type.Zustand,
    string,
    string
];
export type BatchMetadata = [
    Type.BatchMetadata,
    number,
    number,
    number,
    number,
    string
];
export type PartitionedMessage = [
    Type.PartitionedMessage,
    number,
    number
];
export type NetworkRequest = [
    Type.NetworkRequest,
    string,
    string,
    string,
    string,
    string,
    number,
    number,
    number,
    number
];
export type WSChannel = [
    Type.WSChannel,
    string,
    string,
    string,
    number,
    string,
    string
];
export type InputChange = [
    Type.InputChange,
    number,
    string,
    boolean,
    string,
    number,
    number
];
export type SelectionChange = [
    Type.SelectionChange,
    number,
    number,
    string
];
export type MouseThrashing = [
    Type.MouseThrashing,
    number
];
export type UnbindNodes = [
    Type.UnbindNodes,
    number
];
export type ResourceTiming = [
    Type.ResourceTiming,
    number,
    number,
    number,
    number,
    number,
    number,
    string,
    string,
    number,
    boolean
];
export type TabChange = [
    Type.TabChange,
    string
];
export type TabData = [
    Type.TabData,
    string
];
export type CanvasNode = [
    Type.CanvasNode,
    string,
    number
];
export type TagTrigger = [
    Type.TagTrigger,
    number
];
export type Redux = [
    Type.Redux,
    string,
    string,
    number,
    number
];
export type SetPageLocation = [
    Type.SetPageLocation,
    string,
    string,
    number,
    string
];
export type GraphQL = [
    Type.GraphQL,
    string,
    string,
    string,
    string,
    number
];
export type WebVitals = [
    Type.WebVitals,
    string,
    string
];
type Message = Timestamp | SetPageLocationDeprecated | SetViewportSize | SetViewportScroll | CreateDocument | CreateElementNode | CreateTextNode | MoveNode | RemoveNode | SetNodeAttribute | RemoveNodeAttribute | SetNodeData | SetNodeScroll | SetInputTarget | SetInputValue | SetInputChecked | MouseMove | NetworkRequestDeprecated | ConsoleLog | PageLoadTiming | PageRenderTiming | CustomEvent | UserID | UserAnonymousID | Metadata | CSSInsertRule | CSSDeleteRule | Fetch | Profiler | OTable | StateAction | ReduxDeprecated | Vuex | MobX | NgRx | GraphQLDeprecated | PerformanceTrack | StringDictDeprecated | SetNodeAttributeDictDeprecated | StringDict | SetNodeAttributeDict | ResourceTimingDeprecated | ConnectionInformation | SetPageVisibility | LoadFontFace | SetNodeFocus | LongTask | SetNodeAttributeURLBased | SetCSSDataURLBased | TechnicalInfo | CustomIssue | CSSInsertRuleURLBased | MouseClick | MouseClickDeprecated | CreateIFrameDocument | AdoptedSSReplaceURLBased | AdoptedSSInsertRuleURLBased | AdoptedSSDeleteRule | AdoptedSSAddOwner | AdoptedSSRemoveOwner | JSException | Zustand | BatchMetadata | PartitionedMessage | NetworkRequest | WSChannel | InputChange | SelectionChange | MouseThrashing | UnbindNodes | ResourceTiming | TabChange | TabData | CanvasNode | TagTrigger | Redux | SetPageLocation | GraphQL | WebVitals;
export default Message;
