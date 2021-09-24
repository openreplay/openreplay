// Auto-generated, do not edit
import Message from './message';
import Writer from './writer';

function bindNew<C extends { new(...args: A): T }, A extends any[], T>(
  Class: C & { new(...args: A): T }
): C & ((...args: A) => T) {
  function _Class(...args: A) {
    return new Class(...args);
  }
  _Class.prototype = Class.prototype;
  return <C & ((...args: A) => T)>_Class;
}

export const classes: Map<number, Function> = new Map();


class _BatchMeta implements Message {
  readonly _id: number = 80;
  constructor(
    public pageNo: number,
    public firstIndex: number,
    public timestamp: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(80) &&
      writer.uint(this.pageNo) &&
      writer.uint(this.firstIndex) &&
      writer.int(this.timestamp); 
  }
}
export const BatchMeta = bindNew(_BatchMeta);
classes.set(80, BatchMeta);


class _Timestamp implements Message {
  readonly _id: number = 0;
  constructor(
    public timestamp: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(0) &&
      writer.uint(this.timestamp); 
  }
}
export const Timestamp = bindNew(_Timestamp);
classes.set(0, Timestamp);


class _SetPageLocation implements Message {
  readonly _id: number = 4;
  constructor(
    public url: string,
    public referrer: string,
    public navigationStart: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(4) &&
      writer.string(this.url) &&
      writer.string(this.referrer) &&
      writer.uint(this.navigationStart); 
  }
}
export const SetPageLocation = bindNew(_SetPageLocation);
classes.set(4, SetPageLocation);


class _SetViewportSize implements Message {
  readonly _id: number = 5;
  constructor(
    public width: number,
    public height: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(5) &&
      writer.uint(this.width) &&
      writer.uint(this.height); 
  }
}
export const SetViewportSize = bindNew(_SetViewportSize);
classes.set(5, SetViewportSize);


class _SetViewportScroll implements Message {
  readonly _id: number = 6;
  constructor(
    public x: number,
    public y: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(6) &&
      writer.int(this.x) &&
      writer.int(this.y); 
  }
}
export const SetViewportScroll = bindNew(_SetViewportScroll);
classes.set(6, SetViewportScroll);


class _CreateDocument implements Message {
  readonly _id: number = 7;
  constructor(
    
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(7)
      ; 
  }
}
export const CreateDocument = bindNew(_CreateDocument);
classes.set(7, CreateDocument);


class _CreateElementNode implements Message {
  readonly _id: number = 8;
  constructor(
    public id: number,
    public parentID: number,
    public index: number,
    public tag: string,
    public svg: boolean
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(8) &&
      writer.uint(this.id) &&
      writer.uint(this.parentID) &&
      writer.uint(this.index) &&
      writer.string(this.tag) &&
      writer.boolean(this.svg); 
  }
}
export const CreateElementNode = bindNew(_CreateElementNode);
classes.set(8, CreateElementNode);


class _CreateTextNode implements Message {
  readonly _id: number = 9;
  constructor(
    public id: number,
    public parentID: number,
    public index: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(9) &&
      writer.uint(this.id) &&
      writer.uint(this.parentID) &&
      writer.uint(this.index); 
  }
}
export const CreateTextNode = bindNew(_CreateTextNode);
classes.set(9, CreateTextNode);


class _MoveNode implements Message {
  readonly _id: number = 10;
  constructor(
    public id: number,
    public parentID: number,
    public index: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(10) &&
      writer.uint(this.id) &&
      writer.uint(this.parentID) &&
      writer.uint(this.index); 
  }
}
export const MoveNode = bindNew(_MoveNode);
classes.set(10, MoveNode);


class _RemoveNode implements Message {
  readonly _id: number = 11;
  constructor(
    public id: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(11) &&
      writer.uint(this.id); 
  }
}
export const RemoveNode = bindNew(_RemoveNode);
classes.set(11, RemoveNode);


class _SetNodeAttribute implements Message {
  readonly _id: number = 12;
  constructor(
    public id: number,
    public name: string,
    public value: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(12) &&
      writer.uint(this.id) &&
      writer.string(this.name) &&
      writer.string(this.value); 
  }
}
export const SetNodeAttribute = bindNew(_SetNodeAttribute);
classes.set(12, SetNodeAttribute);


class _RemoveNodeAttribute implements Message {
  readonly _id: number = 13;
  constructor(
    public id: number,
    public name: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(13) &&
      writer.uint(this.id) &&
      writer.string(this.name); 
  }
}
export const RemoveNodeAttribute = bindNew(_RemoveNodeAttribute);
classes.set(13, RemoveNodeAttribute);


class _SetNodeData implements Message {
  readonly _id: number = 14;
  constructor(
    public id: number,
    public data: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(14) &&
      writer.uint(this.id) &&
      writer.string(this.data); 
  }
}
export const SetNodeData = bindNew(_SetNodeData);
classes.set(14, SetNodeData);


class _SetNodeScroll implements Message {
  readonly _id: number = 16;
  constructor(
    public id: number,
    public x: number,
    public y: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(16) &&
      writer.uint(this.id) &&
      writer.int(this.x) &&
      writer.int(this.y); 
  }
}
export const SetNodeScroll = bindNew(_SetNodeScroll);
classes.set(16, SetNodeScroll);


class _SetInputTarget implements Message {
  readonly _id: number = 17;
  constructor(
    public id: number,
    public label: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(17) &&
      writer.uint(this.id) &&
      writer.string(this.label); 
  }
}
export const SetInputTarget = bindNew(_SetInputTarget);
classes.set(17, SetInputTarget);


class _SetInputValue implements Message {
  readonly _id: number = 18;
  constructor(
    public id: number,
    public value: string,
    public mask: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(18) &&
      writer.uint(this.id) &&
      writer.string(this.value) &&
      writer.int(this.mask); 
  }
}
export const SetInputValue = bindNew(_SetInputValue);
classes.set(18, SetInputValue);


class _SetInputChecked implements Message {
  readonly _id: number = 19;
  constructor(
    public id: number,
    public checked: boolean
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(19) &&
      writer.uint(this.id) &&
      writer.boolean(this.checked); 
  }
}
export const SetInputChecked = bindNew(_SetInputChecked);
classes.set(19, SetInputChecked);


class _MouseMove implements Message {
  readonly _id: number = 20;
  constructor(
    public x: number,
    public y: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(20) &&
      writer.uint(this.x) &&
      writer.uint(this.y); 
  }
}
export const MouseMove = bindNew(_MouseMove);
classes.set(20, MouseMove);


class _ConsoleLog implements Message {
  readonly _id: number = 22;
  constructor(
    public level: string,
    public value: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(22) &&
      writer.string(this.level) &&
      writer.string(this.value); 
  }
}
export const ConsoleLog = bindNew(_ConsoleLog);
classes.set(22, ConsoleLog);


class _PageLoadTiming implements Message {
  readonly _id: number = 23;
  constructor(
    public requestStart: number,
    public responseStart: number,
    public responseEnd: number,
    public domContentLoadedEventStart: number,
    public domContentLoadedEventEnd: number,
    public loadEventStart: number,
    public loadEventEnd: number,
    public firstPaint: number,
    public firstContentfulPaint: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(23) &&
      writer.uint(this.requestStart) &&
      writer.uint(this.responseStart) &&
      writer.uint(this.responseEnd) &&
      writer.uint(this.domContentLoadedEventStart) &&
      writer.uint(this.domContentLoadedEventEnd) &&
      writer.uint(this.loadEventStart) &&
      writer.uint(this.loadEventEnd) &&
      writer.uint(this.firstPaint) &&
      writer.uint(this.firstContentfulPaint); 
  }
}
export const PageLoadTiming = bindNew(_PageLoadTiming);
classes.set(23, PageLoadTiming);


class _PageRenderTiming implements Message {
  readonly _id: number = 24;
  constructor(
    public speedIndex: number,
    public visuallyComplete: number,
    public timeToInteractive: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(24) &&
      writer.uint(this.speedIndex) &&
      writer.uint(this.visuallyComplete) &&
      writer.uint(this.timeToInteractive); 
  }
}
export const PageRenderTiming = bindNew(_PageRenderTiming);
classes.set(24, PageRenderTiming);


class _JSException implements Message {
  readonly _id: number = 25;
  constructor(
    public name: string,
    public message: string,
    public payload: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(25) &&
      writer.string(this.name) &&
      writer.string(this.message) &&
      writer.string(this.payload); 
  }
}
export const JSException = bindNew(_JSException);
classes.set(25, JSException);


class _RawCustomEvent implements Message {
  readonly _id: number = 27;
  constructor(
    public name: string,
    public payload: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(27) &&
      writer.string(this.name) &&
      writer.string(this.payload); 
  }
}
export const RawCustomEvent = bindNew(_RawCustomEvent);
classes.set(27, RawCustomEvent);


class _UserID implements Message {
  readonly _id: number = 28;
  constructor(
    public id: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(28) &&
      writer.string(this.id); 
  }
}
export const UserID = bindNew(_UserID);
classes.set(28, UserID);


class _UserAnonymousID implements Message {
  readonly _id: number = 29;
  constructor(
    public id: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(29) &&
      writer.string(this.id); 
  }
}
export const UserAnonymousID = bindNew(_UserAnonymousID);
classes.set(29, UserAnonymousID);


class _Metadata implements Message {
  readonly _id: number = 30;
  constructor(
    public key: string,
    public value: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(30) &&
      writer.string(this.key) &&
      writer.string(this.value); 
  }
}
export const Metadata = bindNew(_Metadata);
classes.set(30, Metadata);


class _CSSInsertRule implements Message {
  readonly _id: number = 37;
  constructor(
    public id: number,
    public rule: string,
    public index: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(37) &&
      writer.uint(this.id) &&
      writer.string(this.rule) &&
      writer.uint(this.index); 
  }
}
export const CSSInsertRule = bindNew(_CSSInsertRule);
classes.set(37, CSSInsertRule);


class _CSSDeleteRule implements Message {
  readonly _id: number = 38;
  constructor(
    public id: number,
    public index: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(38) &&
      writer.uint(this.id) &&
      writer.uint(this.index); 
  }
}
export const CSSDeleteRule = bindNew(_CSSDeleteRule);
classes.set(38, CSSDeleteRule);


class _Fetch implements Message {
  readonly _id: number = 39;
  constructor(
    public method: string,
    public url: string,
    public request: string,
    public response: string,
    public status: number,
    public timestamp: number,
    public duration: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(39) &&
      writer.string(this.method) &&
      writer.string(this.url) &&
      writer.string(this.request) &&
      writer.string(this.response) &&
      writer.uint(this.status) &&
      writer.uint(this.timestamp) &&
      writer.uint(this.duration); 
  }
}
export const Fetch = bindNew(_Fetch);
classes.set(39, Fetch);


class _Profiler implements Message {
  readonly _id: number = 40;
  constructor(
    public name: string,
    public duration: number,
    public args: string,
    public result: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(40) &&
      writer.string(this.name) &&
      writer.uint(this.duration) &&
      writer.string(this.args) &&
      writer.string(this.result); 
  }
}
export const Profiler = bindNew(_Profiler);
classes.set(40, Profiler);


class _OTable implements Message {
  readonly _id: number = 41;
  constructor(
    public key: string,
    public value: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(41) &&
      writer.string(this.key) &&
      writer.string(this.value); 
  }
}
export const OTable = bindNew(_OTable);
classes.set(41, OTable);


class _StateAction implements Message {
  readonly _id: number = 42;
  constructor(
    public type: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(42) &&
      writer.string(this.type); 
  }
}
export const StateAction = bindNew(_StateAction);
classes.set(42, StateAction);


class _Redux implements Message {
  readonly _id: number = 44;
  constructor(
    public action: string,
    public state: string,
    public duration: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(44) &&
      writer.string(this.action) &&
      writer.string(this.state) &&
      writer.uint(this.duration); 
  }
}
export const Redux = bindNew(_Redux);
classes.set(44, Redux);


class _Vuex implements Message {
  readonly _id: number = 45;
  constructor(
    public mutation: string,
    public state: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(45) &&
      writer.string(this.mutation) &&
      writer.string(this.state); 
  }
}
export const Vuex = bindNew(_Vuex);
classes.set(45, Vuex);


class _MobX implements Message {
  readonly _id: number = 46;
  constructor(
    public type: string,
    public payload: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(46) &&
      writer.string(this.type) &&
      writer.string(this.payload); 
  }
}
export const MobX = bindNew(_MobX);
classes.set(46, MobX);


class _NgRx implements Message {
  readonly _id: number = 47;
  constructor(
    public action: string,
    public state: string,
    public duration: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(47) &&
      writer.string(this.action) &&
      writer.string(this.state) &&
      writer.uint(this.duration); 
  }
}
export const NgRx = bindNew(_NgRx);
classes.set(47, NgRx);


class _GraphQL implements Message {
  readonly _id: number = 48;
  constructor(
    public operationKind: string,
    public operationName: string,
    public variables: string,
    public response: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(48) &&
      writer.string(this.operationKind) &&
      writer.string(this.operationName) &&
      writer.string(this.variables) &&
      writer.string(this.response); 
  }
}
export const GraphQL = bindNew(_GraphQL);
classes.set(48, GraphQL);


class _PerformanceTrack implements Message {
  readonly _id: number = 49;
  constructor(
    public frames: number,
    public ticks: number,
    public totalJSHeapSize: number,
    public usedJSHeapSize: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(49) &&
      writer.int(this.frames) &&
      writer.int(this.ticks) &&
      writer.uint(this.totalJSHeapSize) &&
      writer.uint(this.usedJSHeapSize); 
  }
}
export const PerformanceTrack = bindNew(_PerformanceTrack);
classes.set(49, PerformanceTrack);


class _ResourceTiming implements Message {
  readonly _id: number = 53;
  constructor(
    public timestamp: number,
    public duration: number,
    public ttfb: number,
    public headerSize: number,
    public encodedBodySize: number,
    public decodedBodySize: number,
    public url: string,
    public initiator: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(53) &&
      writer.uint(this.timestamp) &&
      writer.uint(this.duration) &&
      writer.uint(this.ttfb) &&
      writer.uint(this.headerSize) &&
      writer.uint(this.encodedBodySize) &&
      writer.uint(this.decodedBodySize) &&
      writer.string(this.url) &&
      writer.string(this.initiator); 
  }
}
export const ResourceTiming = bindNew(_ResourceTiming);
classes.set(53, ResourceTiming);


class _ConnectionInformation implements Message {
  readonly _id: number = 54;
  constructor(
    public downlink: number,
    public type: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(54) &&
      writer.uint(this.downlink) &&
      writer.string(this.type); 
  }
}
export const ConnectionInformation = bindNew(_ConnectionInformation);
classes.set(54, ConnectionInformation);


class _SetPageVisibility implements Message {
  readonly _id: number = 55;
  constructor(
    public hidden: boolean
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(55) &&
      writer.boolean(this.hidden); 
  }
}
export const SetPageVisibility = bindNew(_SetPageVisibility);
classes.set(55, SetPageVisibility);


class _LongTask implements Message {
  readonly _id: number = 59;
  constructor(
    public timestamp: number,
    public duration: number,
    public context: number,
    public containerType: number,
    public containerSrc: string,
    public containerId: string,
    public containerName: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(59) &&
      writer.uint(this.timestamp) &&
      writer.uint(this.duration) &&
      writer.uint(this.context) &&
      writer.uint(this.containerType) &&
      writer.string(this.containerSrc) &&
      writer.string(this.containerId) &&
      writer.string(this.containerName); 
  }
}
export const LongTask = bindNew(_LongTask);
classes.set(59, LongTask);


class _SetNodeAttributeURLBased implements Message {
  readonly _id: number = 60;
  constructor(
    public id: number,
    public name: string,
    public value: string,
    public baseURL: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(60) &&
      writer.uint(this.id) &&
      writer.string(this.name) &&
      writer.string(this.value) &&
      writer.string(this.baseURL); 
  }
}
export const SetNodeAttributeURLBased = bindNew(_SetNodeAttributeURLBased);
classes.set(60, SetNodeAttributeURLBased);


class _SetCSSDataURLBased implements Message {
  readonly _id: number = 61;
  constructor(
    public id: number,
    public data: string,
    public baseURL: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(61) &&
      writer.uint(this.id) &&
      writer.string(this.data) &&
      writer.string(this.baseURL); 
  }
}
export const SetCSSDataURLBased = bindNew(_SetCSSDataURLBased);
classes.set(61, SetCSSDataURLBased);


class _TechnicalInfo implements Message {
  readonly _id: number = 63;
  constructor(
    public type: string,
    public value: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(63) &&
      writer.string(this.type) &&
      writer.string(this.value); 
  }
}
export const TechnicalInfo = bindNew(_TechnicalInfo);
classes.set(63, TechnicalInfo);


class _CustomIssue implements Message {
  readonly _id: number = 64;
  constructor(
    public name: string,
    public payload: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(64) &&
      writer.string(this.name) &&
      writer.string(this.payload); 
  }
}
export const CustomIssue = bindNew(_CustomIssue);
classes.set(64, CustomIssue);


class _PageClose implements Message {
  readonly _id: number = 65;
  constructor(
    
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(65)
      ; 
  }
}
export const PageClose = bindNew(_PageClose);
classes.set(65, PageClose);


class _CSSInsertRuleURLBased implements Message {
  readonly _id: number = 67;
  constructor(
    public id: number,
    public rule: string,
    public index: number,
    public baseURL: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(67) &&
      writer.uint(this.id) &&
      writer.string(this.rule) &&
      writer.uint(this.index) &&
      writer.string(this.baseURL); 
  }
}
export const CSSInsertRuleURLBased = bindNew(_CSSInsertRuleURLBased);
classes.set(67, CSSInsertRuleURLBased);


class _MouseClick implements Message {
  readonly _id: number = 69;
  constructor(
    public id: number,
    public hesitationTime: number,
    public label: string,
    public selector: string
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(69) &&
      writer.uint(this.id) &&
      writer.uint(this.hesitationTime) &&
      writer.string(this.label) &&
      writer.string(this.selector); 
  }
}
export const MouseClick = bindNew(_MouseClick);
classes.set(69, MouseClick);


class _CreateIFrameDocument implements Message {
  readonly _id: number = 70;
  constructor(
    public frameID: number,
    public id: number
  ) {}
  encode(writer: Writer): boolean {
    return writer.uint(70) &&
      writer.uint(this.frameID) &&
      writer.uint(this.id); 
  }
}
export const CreateIFrameDocument = bindNew(_CreateIFrameDocument);
classes.set(70, CreateIFrameDocument);


