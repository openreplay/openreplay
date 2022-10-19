// Auto-generated, do not edit

import * as Messages from '../../common/messages.gen.js'
export { default } from '../../common/messages.gen.js'

export function BatchMetadata(
  version: number,
  pageNo: number,
  firstIndex: number,
  timestamp: number,
  location: string,
): Messages.BatchMetadata {
  return [Messages.Type.BatchMetadata, version, pageNo, firstIndex, timestamp, location]
}

export function PartitionedMessage(partNo: number, partTotal: number): Messages.PartitionedMessage {
  return [Messages.Type.PartitionedMessage, partNo, partTotal]
}

export function Timestamp(timestamp: number): Messages.Timestamp {
  return [Messages.Type.Timestamp, timestamp]
}

export function SetPageLocation(
  url: string,
  referrer: string,
  navigationStart: number,
): Messages.SetPageLocation {
  return [Messages.Type.SetPageLocation, url, referrer, navigationStart]
}

export function SetViewportSize(width: number, height: number): Messages.SetViewportSize {
  return [Messages.Type.SetViewportSize, width, height]
}

export function SetViewportScroll(x: number, y: number): Messages.SetViewportScroll {
  return [Messages.Type.SetViewportScroll, x, y]
}

export function CreateDocument(): Messages.CreateDocument {
  return [Messages.Type.CreateDocument]
}

export function CreateElementNode(
  id: number,
  parentID: number,
  index: number,
  tag: string,
  svg: boolean,
): Messages.CreateElementNode {
  return [Messages.Type.CreateElementNode, id, parentID, index, tag, svg]
}

export function CreateTextNode(
  id: number,
  parentID: number,
  index: number,
): Messages.CreateTextNode {
  return [Messages.Type.CreateTextNode, id, parentID, index]
}

export function MoveNode(id: number, parentID: number, index: number): Messages.MoveNode {
  return [Messages.Type.MoveNode, id, parentID, index]
}

export function RemoveNode(id: number): Messages.RemoveNode {
  return [Messages.Type.RemoveNode, id]
}

export function SetNodeAttribute(
  id: number,
  name: string,
  value: string,
): Messages.SetNodeAttribute {
  return [Messages.Type.SetNodeAttribute, id, name, value]
}

export function RemoveNodeAttribute(id: number, name: string): Messages.RemoveNodeAttribute {
  return [Messages.Type.RemoveNodeAttribute, id, name]
}

export function SetNodeData(id: number, data: string): Messages.SetNodeData {
  return [Messages.Type.SetNodeData, id, data]
}

export function SetNodeScroll(id: number, x: number, y: number): Messages.SetNodeScroll {
  return [Messages.Type.SetNodeScroll, id, x, y]
}

export function SetInputTarget(id: number, label: string): Messages.SetInputTarget {
  return [Messages.Type.SetInputTarget, id, label]
}

export function SetInputValue(id: number, value: string, mask: number): Messages.SetInputValue {
  return [Messages.Type.SetInputValue, id, value, mask]
}

export function SetInputChecked(id: number, checked: boolean): Messages.SetInputChecked {
  return [Messages.Type.SetInputChecked, id, checked]
}

export function MouseMove(x: number, y: number): Messages.MouseMove {
  return [Messages.Type.MouseMove, x, y]
}

export function ConsoleLog(level: string, value: string): Messages.ConsoleLog {
  return [Messages.Type.ConsoleLog, level, value]
}

export function PageLoadTiming(
  requestStart: number,
  responseStart: number,
  responseEnd: number,
  domContentLoadedEventStart: number,
  domContentLoadedEventEnd: number,
  loadEventStart: number,
  loadEventEnd: number,
  firstPaint: number,
  firstContentfulPaint: number,
): Messages.PageLoadTiming {
  return [
    Messages.Type.PageLoadTiming,
    requestStart,
    responseStart,
    responseEnd,
    domContentLoadedEventStart,
    domContentLoadedEventEnd,
    loadEventStart,
    loadEventEnd,
    firstPaint,
    firstContentfulPaint,
  ]
}

export function PageRenderTiming(
  speedIndex: number,
  visuallyComplete: number,
  timeToInteractive: number,
): Messages.PageRenderTiming {
  return [Messages.Type.PageRenderTiming, speedIndex, visuallyComplete, timeToInteractive]
}

export function JSException(
  name: string,
  message: string,
  payload: string,
  metadata: string,
): Messages.JSException {
  return [Messages.Type.JSException, name, message, payload, metadata]
}

export function RawCustomEvent(name: string, payload: string): Messages.RawCustomEvent {
  return [Messages.Type.RawCustomEvent, name, payload]
}

export function UserID(id: string): Messages.UserID {
  return [Messages.Type.UserID, id]
}

export function UserAnonymousID(id: string): Messages.UserAnonymousID {
  return [Messages.Type.UserAnonymousID, id]
}

export function Metadata(key: string, value: string): Messages.Metadata {
  return [Messages.Type.Metadata, key, value]
}

export function CSSInsertRule(id: number, rule: string, index: number): Messages.CSSInsertRule {
  return [Messages.Type.CSSInsertRule, id, rule, index]
}

export function CSSDeleteRule(id: number, index: number): Messages.CSSDeleteRule {
  return [Messages.Type.CSSDeleteRule, id, index]
}

export function Fetch(
  method: string,
  url: string,
  request: string,
  response: string,
  status: number,
  timestamp: number,
  duration: number,
): Messages.Fetch {
  return [Messages.Type.Fetch, method, url, request, response, status, timestamp, duration]
}

export function Profiler(
  name: string,
  duration: number,
  args: string,
  result: string,
): Messages.Profiler {
  return [Messages.Type.Profiler, name, duration, args, result]
}

export function OTable(key: string, value: string): Messages.OTable {
  return [Messages.Type.OTable, key, value]
}

export function StateAction(type: string): Messages.StateAction {
  return [Messages.Type.StateAction, type]
}

export function Redux(action: string, state: string, duration: number): Messages.Redux {
  return [Messages.Type.Redux, action, state, duration]
}

export function Vuex(mutation: string, state: string): Messages.Vuex {
  return [Messages.Type.Vuex, mutation, state]
}

export function MobX(type: string, payload: string): Messages.MobX {
  return [Messages.Type.MobX, type, payload]
}

export function NgRx(action: string, state: string, duration: number): Messages.NgRx {
  return [Messages.Type.NgRx, action, state, duration]
}

export function GraphQL(
  operationKind: string,
  operationName: string,
  variables: string,
  response: string,
): Messages.GraphQL {
  return [Messages.Type.GraphQL, operationKind, operationName, variables, response]
}

export function PerformanceTrack(
  frames: number,
  ticks: number,
  totalJSHeapSize: number,
  usedJSHeapSize: number,
): Messages.PerformanceTrack {
  return [Messages.Type.PerformanceTrack, frames, ticks, totalJSHeapSize, usedJSHeapSize]
}

export function ResourceTiming(
  timestamp: number,
  duration: number,
  ttfb: number,
  headerSize: number,
  encodedBodySize: number,
  decodedBodySize: number,
  url: string,
  initiator: string,
): Messages.ResourceTiming {
  return [
    Messages.Type.ResourceTiming,
    timestamp,
    duration,
    ttfb,
    headerSize,
    encodedBodySize,
    decodedBodySize,
    url,
    initiator,
  ]
}

export function ConnectionInformation(
  downlink: number,
  type: string,
): Messages.ConnectionInformation {
  return [Messages.Type.ConnectionInformation, downlink, type]
}

export function SetPageVisibility(hidden: boolean): Messages.SetPageVisibility {
  return [Messages.Type.SetPageVisibility, hidden]
}

export function LongTask(
  timestamp: number,
  duration: number,
  context: number,
  containerType: number,
  containerSrc: string,
  containerId: string,
  containerName: string,
): Messages.LongTask {
  return [
    Messages.Type.LongTask,
    timestamp,
    duration,
    context,
    containerType,
    containerSrc,
    containerId,
    containerName,
  ]
}

export function SetNodeAttributeURLBased(
  id: number,
  name: string,
  value: string,
  baseURL: string,
): Messages.SetNodeAttributeURLBased {
  return [Messages.Type.SetNodeAttributeURLBased, id, name, value, baseURL]
}

export function SetCSSDataURLBased(
  id: number,
  data: string,
  baseURL: string,
): Messages.SetCSSDataURLBased {
  return [Messages.Type.SetCSSDataURLBased, id, data, baseURL]
}

export function TechnicalInfo(type: string, value: string): Messages.TechnicalInfo {
  return [Messages.Type.TechnicalInfo, type, value]
}

export function CustomIssue(name: string, payload: string): Messages.CustomIssue {
  return [Messages.Type.CustomIssue, name, payload]
}

export function CSSInsertRuleURLBased(
  id: number,
  rule: string,
  index: number,
  baseURL: string,
): Messages.CSSInsertRuleURLBased {
  return [Messages.Type.CSSInsertRuleURLBased, id, rule, index, baseURL]
}

export function MouseClick(
  id: number,
  hesitationTime: number,
  label: string,
  selector: string,
): Messages.MouseClick {
  return [Messages.Type.MouseClick, id, hesitationTime, label, selector]
}

export function CreateIFrameDocument(frameID: number, id: number): Messages.CreateIFrameDocument {
  return [Messages.Type.CreateIFrameDocument, frameID, id]
}
