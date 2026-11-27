// Auto-generated, do not edit
/* eslint-disable */

import PrimitiveReader from './PrimitiveReader'
import { MType } from './raw.gen'
import type { RawMessage } from './raw.gen'

const SIZE_BYTES = 3

// Message types that are written WITHOUT a size prefix (batch-level protocol messages)
const NO_SIZE_TYPES = new Set([80, 81, 82])

export default class TrackerBinaryReader extends PrimitiveReader {
  batchMetaMessages: any[] = []
  /** Stamped on every message as it is created (one object shape, no later property adds) */
  time = 0
  tabId = ''

  readMessage(): RawMessage | null {
    const p = this.p
    const tp = this.readUint()
    if (tp === null) { return null }

    // Batch-level messages have no size prefix — read fields directly to advance pointer, then skip
    if (NO_SIZE_TYPES.has(tp)) {
      switch (tp) {
      case 81: {
        // BatchMetadata: Version, PageNo, FirstIndex, Timestamp, Location
        const version = this.readUint(); if (version === null) { this.p = p; return null }
        const pageNo = this.readUint(); if (pageNo === null) { this.p = p; return null }
        const firstIndex = this.readUint(); if (firstIndex === null) { this.p = p; return null }
        const timestamp = this.readInt(); if (timestamp === null) { this.p = p; return null }
        const location = this.readString(); if (location === null) { this.p = p; return null }
        this.batchMetaMessages.push({
          tp: 81,
          version,
          pageNo,
          firstIndex,
          timestamp,
          location,
        });
        return this.readMessage()
      }
      case 82: {
        // PartitionedMessage: PartNo, PartTotal
        const partNo = this.readUint(); if (partNo === null) { this.p = p; return null }
        const partTotal = this.readUint(); if (partTotal === null) { this.p = p; return null }
        return this.readMessage()
      }
      default:
        // Unknown no-size message, cannot skip safely
        return null
      }
    }

    // All other messages have a 3-byte size prefix
    const size = this.readSize()
    if (size === null) { this.p = p; return null }

    const bodyStart = this.p
    // Wait for the whole body; once it is here, its fields are read unchecked
    if (bodyStart + size > this.buf.length) { this.p = p; return null }
    const msg = this.readBody(tp)
    if (msg === undefined) {
      // Skip unknown message type using its size prefix
      this.p = bodyStart + size
      return this.readMessage()
    }
    // Fields ran past the data: a corrupt body, read it as incomplete
    if (this.p > this.buf.length) { this.p = p; return null }
    return msg
  }

  private readBody(tp: number): RawMessage | undefined {
    switch (tp) {

    case 0:
      return {
        tp: MType.Timestamp,
        timestamp: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 4:
      return {
        tp: MType.SetPageLocationDeprecated,
        url: this.stringU(),
        referrer: this.stringU(),
        navigationStart: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 5:
      return {
        tp: MType.SetViewportSize,
        width: this.uintU(),
        height: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 6:
      return {
        tp: MType.SetViewportScroll,
        x: this.intU(),
        y: this.intU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 7:
      return {
        tp: MType.CreateDocument,

        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 8:
      return {
        tp: MType.CreateElementNode,
        id: this.uintU(),
        parentID: this.uintU(),
        index: this.uintU(),
        tag: this.stringU(),
        svg: this.booleanU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 9:
      return {
        tp: MType.CreateTextNode,
        id: this.uintU(),
        parentID: this.uintU(),
        index: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 10:
      return {
        tp: MType.MoveNode,
        id: this.uintU(),
        parentID: this.uintU(),
        index: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 11:
      return {
        tp: MType.RemoveNode,
        id: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 12:
      return {
        tp: MType.SetNodeAttribute,
        id: this.uintU(),
        name: this.stringU(),
        value: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 13:
      return {
        tp: MType.RemoveNodeAttribute,
        id: this.uintU(),
        name: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 14:
      return {
        tp: MType.SetNodeData,
        id: this.uintU(),
        data: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 15:
      return {
        tp: MType.SetCssData,
        id: this.uintU(),
        data: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 16:
      return {
        tp: MType.SetNodeScroll,
        id: this.uintU(),
        x: this.intU(),
        y: this.intU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 18:
      return {
        tp: MType.SetInputValue,
        id: this.uintU(),
        value: this.stringU(),
        mask: this.intU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 19:
      return {
        tp: MType.SetInputChecked,
        id: this.uintU(),
        checked: this.booleanU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 20:
      return {
        tp: MType.MouseMove,
        x: this.uintU(),
        y: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 21:
      return {
        tp: MType.NetworkRequestDeprecated,
        type: this.stringU(),
        method: this.stringU(),
        url: this.stringU(),
        request: this.stringU(),
        response: this.stringU(),
        status: this.uintU(),
        timestamp: this.uintU(),
        duration: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 22:
      return {
        tp: MType.ConsoleLog,
        level: this.stringU(),
        value: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 34:
      return {
        tp: MType.StringDictGlobal,
        key: this.uintU(),
        value: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 35:
      return {
        tp: MType.SetNodeAttributeDictGlobal,
        id: this.uintU(),
        name: this.uintU(),
        value: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 36:
      return {
        tp: MType.NodeAnimationResult,
        id: this.uintU(),
        styles: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 40:
      return {
        tp: MType.Profiler,
        name: this.stringU(),
        duration: this.uintU(),
        args: this.stringU(),
        result: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 41:
      return {
        tp: MType.OTable,
        key: this.stringU(),
        value: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 44:
      return {
        tp: MType.ReduxDeprecated,
        action: this.stringU(),
        state: this.stringU(),
        duration: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 45:
      return {
        tp: MType.Vuex,
        mutation: this.stringU(),
        state: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 46:
      return {
        tp: MType.MobX,
        type: this.stringU(),
        payload: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 47:
      return {
        tp: MType.NgRx,
        action: this.stringU(),
        state: this.stringU(),
        duration: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 48:
      return {
        tp: MType.GraphQlDeprecated,
        operationKind: this.stringU(),
        operationName: this.stringU(),
        variables: this.stringU(),
        response: this.stringU(),
        duration: this.intU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 49:
      return {
        tp: MType.PerformanceTrack,
        frames: this.intU(),
        ticks: this.intU(),
        totalJSHeapSize: this.uintU(),
        usedJSHeapSize: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 50:
      return {
        tp: MType.StringDictDeprecated,
        key: this.uintU(),
        value: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 51:
      return {
        tp: MType.SetNodeAttributeDictDeprecated,
        id: this.uintU(),
        nameKey: this.uintU(),
        valueKey: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 43:
      return {
        tp: MType.StringDict,
        key: this.stringU(),
        value: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 52:
      return {
        tp: MType.SetNodeAttributeDict,
        id: this.uintU(),
        name: this.stringU(),
        value: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 53:
      return {
        tp: MType.ResourceTimingDeprecatedDeprecated,
        timestamp: this.uintU(),
        duration: this.uintU(),
        ttfb: this.uintU(),
        headerSize: this.uintU(),
        encodedBodySize: this.uintU(),
        decodedBodySize: this.uintU(),
        url: this.stringU(),
        initiator: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 54:
      return {
        tp: MType.ConnectionInformation,
        downlink: this.uintU(),
        type: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 55:
      return {
        tp: MType.SetPageVisibility,
        hidden: this.booleanU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 57:
      return {
        tp: MType.LoadFontFace,
        parentID: this.uintU(),
        family: this.stringU(),
        source: this.stringU(),
        descriptors: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 58:
      return {
        tp: MType.SetNodeFocus,
        id: this.intU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 60:
      return {
        tp: MType.SetNodeAttributeURLBased,
        id: this.uintU(),
        name: this.stringU(),
        value: this.stringU(),
        baseURL: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 61:
      return {
        tp: MType.SetCssDataURLBased,
        id: this.uintU(),
        data: this.stringU(),
        baseURL: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 65:
      return {
        tp: MType.SetNodeSlot,
        id: this.uintU(),
        slotID: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 68:
      return {
        tp: MType.MouseClick,
        id: this.uintU(),
        hesitationTime: this.uintU(),
        label: this.stringU(),
        selector: this.stringU(),
        normalizedX: this.uintU(),
        normalizedY: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 69:
      return {
        tp: MType.MouseClickDeprecated,
        id: this.uintU(),
        hesitationTime: this.uintU(),
        label: this.stringU(),
        selector: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 70:
      return {
        tp: MType.CreateIFrameDocument,
        frameID: this.uintU(),
        id: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 71:
      return {
        tp: MType.AdoptedSsReplaceURLBased,
        sheetID: this.uintU(),
        text: this.stringU(),
        baseURL: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 72:
      return {
        tp: MType.AdoptedSsReplace,
        sheetID: this.uintU(),
        text: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 73:
      return {
        tp: MType.AdoptedSsInsertRuleURLBased,
        sheetID: this.uintU(),
        rule: this.stringU(),
        index: this.uintU(),
        baseURL: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 74:
      return {
        tp: MType.AdoptedSsInsertRule,
        sheetID: this.uintU(),
        rule: this.stringU(),
        index: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 75:
      return {
        tp: MType.AdoptedSsDeleteRule,
        sheetID: this.uintU(),
        index: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 76:
      return {
        tp: MType.AdoptedSsAddOwner,
        sheetID: this.uintU(),
        id: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 77:
      return {
        tp: MType.AdoptedSsRemoveOwner,
        sheetID: this.uintU(),
        id: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 79:
      return {
        tp: MType.Zustand,
        mutation: this.stringU(),
        state: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 83:
      return {
        tp: MType.NetworkRequest,
        type: this.stringU(),
        method: this.stringU(),
        url: this.stringU(),
        request: this.stringU(),
        response: this.stringU(),
        status: this.uintU(),
        timestamp: this.uintU(),
        duration: this.uintU(),
        transferredBodySize: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 84:
      return {
        tp: MType.WsChannel,
        chType: this.stringU(),
        channelName: this.stringU(),
        data: this.stringU(),
        timestamp: this.uintU(),
        dir: this.stringU(),
        messageType: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 85:
      return {
        tp: MType.ResourceTiming,
        timestamp: this.uintU(),
        duration: this.uintU(),
        ttfb: this.uintU(),
        headerSize: this.uintU(),
        encodedBodySize: this.uintU(),
        decodedBodySize: this.uintU(),
        url: this.stringU(),
        initiator: this.stringU(),
        transferredSize: this.uintU(),
        cached: this.booleanU(),
        queueing: this.uintU(),
        dnsLookup: this.uintU(),
        initialConnection: this.uintU(),
        ssl: this.uintU(),
        contentDownload: this.uintU(),
        total: this.uintU(),
        stalled: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 87:
      return {
        tp: MType.Incident,
        label: this.stringU(),
        startTime: this.intU(),
        endTime: this.intU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 89:
      return {
        tp: MType.LongAnimationTask,
        name: this.stringU(),
        duration: this.intU(),
        blockingDuration: this.intU(),
        firstUIEventTimestamp: this.intU(),
        startTime: this.intU(),
        scripts: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 113:
      return {
        tp: MType.SelectionChange,
        selectionStart: this.uintU(),
        selectionEnd: this.uintU(),
        selection: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 114:
      return {
        tp: MType.MouseThrashing,
        timestamp: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 116:
      return {
        tp: MType.ResourceTimingDeprecated,
        timestamp: this.uintU(),
        duration: this.uintU(),
        ttfb: this.uintU(),
        headerSize: this.uintU(),
        encodedBodySize: this.uintU(),
        decodedBodySize: this.uintU(),
        url: this.stringU(),
        initiator: this.stringU(),
        transferredSize: this.uintU(),
        cached: this.booleanU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 117:
      return {
        tp: MType.TabChange,
        tabId: this.stringU(),
        time: this.time,
      } as RawMessage;

    case 118:
      return {
        tp: MType.TabData,
        tabId: this.stringU(),
        time: this.time,
      } as RawMessage;

    case 119:
      return {
        tp: MType.CanvasNode,
        nodeId: this.stringU(),
        timestamp: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 120:
      return {
        tp: MType.TagTrigger,
        tagId: this.intU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 121:
      return {
        tp: MType.Redux,
        action: this.stringU(),
        state: this.stringU(),
        duration: this.uintU(),
        actionTime: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 122:
      return {
        tp: MType.SetPageLocation,
        url: this.stringU(),
        referrer: this.stringU(),
        navigationStart: this.uintU(),
        documentTitle: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 123:
      return {
        tp: MType.GraphQl,
        operationKind: this.stringU(),
        operationName: this.stringU(),
        variables: this.stringU(),
        response: this.stringU(),
        duration: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 93:
      return {
        tp: MType.MobileEvent,
        timestamp: this.uintU(),
        length: this.uintU(),
        name: this.stringU(),
        payload: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 96:
      return {
        tp: MType.MobileScreenChanges,
        timestamp: this.uintU(),
        length: this.uintU(),
        x: this.uintU(),
        y: this.uintU(),
        width: this.uintU(),
        height: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 100:
      return {
        tp: MType.MobileClickEvent,
        timestamp: this.uintU(),
        length: this.uintU(),
        label: this.stringU(),
        x: this.uintU(),
        y: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 101:
      return {
        tp: MType.MobileInputEvent,
        timestamp: this.uintU(),
        length: this.uintU(),
        value: this.stringU(),
        valueMasked: this.booleanU(),
        label: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 102:
      return {
        tp: MType.MobilePerformanceEvent,
        timestamp: this.uintU(),
        length: this.uintU(),
        name: this.stringU(),
        value: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 103:
      return {
        tp: MType.MobileLog,
        timestamp: this.uintU(),
        length: this.uintU(),
        severity: this.stringU(),
        content: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 104:
      return {
        tp: MType.MobileInternalError,
        timestamp: this.uintU(),
        length: this.uintU(),
        content: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 105:
      return {
        tp: MType.MobileNetworkCall,
        timestamp: this.uintU(),
        length: this.uintU(),
        type: this.stringU(),
        method: this.stringU(),
        url: this.stringU(),
        request: this.stringU(),
        response: this.stringU(),
        status: this.uintU(),
        duration: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 106:
      return {
        tp: MType.MobileSwipeEvent,
        timestamp: this.uintU(),
        length: this.uintU(),
        label: this.stringU(),
        x: this.uintU(),
        y: this.uintU(),
        direction: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 107:
      return {
        tp: MType.MobileBatchMeta,
        timestamp: this.uintU(),
        length: this.uintU(),
        firstIndex: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 109:
      return {
        tp: MType.MobileGraphQl,
        timestamp: this.uintU(),
        length: this.uintU(),
        operationKind: this.stringU(),
        operationName: this.stringU(),
        variables: this.stringU(),
        response: this.stringU(),
        duration: this.uintU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    case 111:
      return {
        tp: MType.MobileIssueEvent,
        timestamp: this.uintU(),
        type: this.stringU(),
        contextString: this.stringU(),
        context: this.stringU(),
        payload: this.stringU(),
        time: this.time,
        tabId: this.tabId,
      } as RawMessage;

    default:
      return undefined
    }
  }
}
