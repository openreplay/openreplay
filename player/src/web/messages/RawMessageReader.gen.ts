// Auto-generated, do not edit
/* eslint-disable */

import PrimitiveReader from './PrimitiveReader'
import { MType } from './raw.gen'
import type { RawMessage } from './raw.gen'


export default class RawMessageReader extends PrimitiveReader {
  readMessage(): RawMessage | null {
    const p = this.p
    const tp = this.readUint()
    if (tp === null) { return null }

    switch (tp) {

    case 0: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      return {
        tp: MType.Timestamp,
        timestamp,
      };
    }

    case 4: {
      const url = this.readString(); if (url === null) { this.p = p; return null }
      const referrer = this.readString(); if (referrer === null) { this.p = p; return null }
      const navigationStart = this.readUint(); if (navigationStart === null) { this.p = p; return null }
      return {
        tp: MType.SetPageLocationDeprecated,
        url,
        referrer,
        navigationStart,
      };
    }

    case 5: {
      const width = this.readUint(); if (width === null) { this.p = p; return null }
      const height = this.readUint(); if (height === null) { this.p = p; return null }
      return {
        tp: MType.SetViewportSize,
        width,
        height,
      };
    }

    case 6: {
      const x = this.readInt(); if (x === null) { this.p = p; return null }
      const y = this.readInt(); if (y === null) { this.p = p; return null }
      return {
        tp: MType.SetViewportScroll,
        x,
        y,
      };
    }

    case 7: {

      return {
        tp: MType.CreateDocument,

      };
    }

    case 8: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const parentID = this.readUint(); if (parentID === null) { this.p = p; return null }
      const index = this.readUint(); if (index === null) { this.p = p; return null }
      const tag = this.readString(); if (tag === null) { this.p = p; return null }
      const svg = this.readBoolean(); if (svg === null) { this.p = p; return null }
      return {
        tp: MType.CreateElementNode,
        id,
        parentID,
        index,
        tag,
        svg,
      };
    }

    case 9: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const parentID = this.readUint(); if (parentID === null) { this.p = p; return null }
      const index = this.readUint(); if (index === null) { this.p = p; return null }
      return {
        tp: MType.CreateTextNode,
        id,
        parentID,
        index,
      };
    }

    case 10: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const parentID = this.readUint(); if (parentID === null) { this.p = p; return null }
      const index = this.readUint(); if (index === null) { this.p = p; return null }
      return {
        tp: MType.MoveNode,
        id,
        parentID,
        index,
      };
    }

    case 11: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      return {
        tp: MType.RemoveNode,
        id,
      };
    }

    case 12: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const name = this.readString(); if (name === null) { this.p = p; return null }
      const value = this.readString(); if (value === null) { this.p = p; return null }
      return {
        tp: MType.SetNodeAttribute,
        id,
        name,
        value,
      };
    }

    case 13: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const name = this.readString(); if (name === null) { this.p = p; return null }
      return {
        tp: MType.RemoveNodeAttribute,
        id,
        name,
      };
    }

    case 14: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const data = this.readString(); if (data === null) { this.p = p; return null }
      return {
        tp: MType.SetNodeData,
        id,
        data,
      };
    }

    case 15: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const data = this.readString(); if (data === null) { this.p = p; return null }
      return {
        tp: MType.SetCssData,
        id,
        data,
      };
    }

    case 16: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const x = this.readInt(); if (x === null) { this.p = p; return null }
      const y = this.readInt(); if (y === null) { this.p = p; return null }
      return {
        tp: MType.SetNodeScroll,
        id,
        x,
        y,
      };
    }

    case 18: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const value = this.readString(); if (value === null) { this.p = p; return null }
      const mask = this.readInt(); if (mask === null) { this.p = p; return null }
      return {
        tp: MType.SetInputValue,
        id,
        value,
        mask,
      };
    }

    case 19: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const checked = this.readBoolean(); if (checked === null) { this.p = p; return null }
      return {
        tp: MType.SetInputChecked,
        id,
        checked,
      };
    }

    case 20: {
      const x = this.readUint(); if (x === null) { this.p = p; return null }
      const y = this.readUint(); if (y === null) { this.p = p; return null }
      return {
        tp: MType.MouseMove,
        x,
        y,
      };
    }

    case 21: {
      const type = this.readString(); if (type === null) { this.p = p; return null }
      const method = this.readString(); if (method === null) { this.p = p; return null }
      const url = this.readString(); if (url === null) { this.p = p; return null }
      const request = this.readString(); if (request === null) { this.p = p; return null }
      const response = this.readString(); if (response === null) { this.p = p; return null }
      const status = this.readUint(); if (status === null) { this.p = p; return null }
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      return {
        tp: MType.NetworkRequestDeprecated,
        type,
        method,
        url,
        request,
        response,
        status,
        timestamp,
        duration,
      };
    }

    case 22: {
      const level = this.readString(); if (level === null) { this.p = p; return null }
      const value = this.readString(); if (value === null) { this.p = p; return null }
      return {
        tp: MType.ConsoleLog,
        level,
        value,
      };
    }

    case 34: {
      const key = this.readUint(); if (key === null) { this.p = p; return null }
      const value = this.readString(); if (value === null) { this.p = p; return null }
      return {
        tp: MType.StringDictGlobal,
        key,
        value,
      };
    }

    case 35: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const name = this.readUint(); if (name === null) { this.p = p; return null }
      const value = this.readUint(); if (value === null) { this.p = p; return null }
      return {
        tp: MType.SetNodeAttributeDictGlobal,
        id,
        name,
        value,
      };
    }

    case 36: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const styles = this.readString(); if (styles === null) { this.p = p; return null }
      return {
        tp: MType.NodeAnimationResult,
        id,
        styles,
      };
    }

    case 40: {
      const name = this.readString(); if (name === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      const args = this.readString(); if (args === null) { this.p = p; return null }
      const result = this.readString(); if (result === null) { this.p = p; return null }
      return {
        tp: MType.Profiler,
        name,
        duration,
        args,
        result,
      };
    }

    case 41: {
      const key = this.readString(); if (key === null) { this.p = p; return null }
      const value = this.readString(); if (value === null) { this.p = p; return null }
      return {
        tp: MType.OTable,
        key,
        value,
      };
    }

    case 44: {
      const action = this.readString(); if (action === null) { this.p = p; return null }
      const state = this.readString(); if (state === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      return {
        tp: MType.ReduxDeprecated,
        action,
        state,
        duration,
      };
    }

    case 45: {
      const mutation = this.readString(); if (mutation === null) { this.p = p; return null }
      const state = this.readString(); if (state === null) { this.p = p; return null }
      return {
        tp: MType.Vuex,
        mutation,
        state,
      };
    }

    case 46: {
      const type = this.readString(); if (type === null) { this.p = p; return null }
      const payload = this.readString(); if (payload === null) { this.p = p; return null }
      return {
        tp: MType.MobX,
        type,
        payload,
      };
    }

    case 47: {
      const action = this.readString(); if (action === null) { this.p = p; return null }
      const state = this.readString(); if (state === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      return {
        tp: MType.NgRx,
        action,
        state,
        duration,
      };
    }

    case 48: {
      const operationKind = this.readString(); if (operationKind === null) { this.p = p; return null }
      const operationName = this.readString(); if (operationName === null) { this.p = p; return null }
      const variables = this.readString(); if (variables === null) { this.p = p; return null }
      const response = this.readString(); if (response === null) { this.p = p; return null }
      const duration = this.readInt(); if (duration === null) { this.p = p; return null }
      return {
        tp: MType.GraphQlDeprecated,
        operationKind,
        operationName,
        variables,
        response,
        duration,
      };
    }

    case 49: {
      const frames = this.readInt(); if (frames === null) { this.p = p; return null }
      const ticks = this.readInt(); if (ticks === null) { this.p = p; return null }
      const totalJSHeapSize = this.readUint(); if (totalJSHeapSize === null) { this.p = p; return null }
      const usedJSHeapSize = this.readUint(); if (usedJSHeapSize === null) { this.p = p; return null }
      return {
        tp: MType.PerformanceTrack,
        frames,
        ticks,
        totalJSHeapSize,
        usedJSHeapSize,
      };
    }

    case 50: {
      const key = this.readUint(); if (key === null) { this.p = p; return null }
      const value = this.readString(); if (value === null) { this.p = p; return null }
      return {
        tp: MType.StringDictDeprecated,
        key,
        value,
      };
    }

    case 51: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const nameKey = this.readUint(); if (nameKey === null) { this.p = p; return null }
      const valueKey = this.readUint(); if (valueKey === null) { this.p = p; return null }
      return {
        tp: MType.SetNodeAttributeDictDeprecated,
        id,
        nameKey,
        valueKey,
      };
    }

    case 43: {
      const key = this.readString(); if (key === null) { this.p = p; return null }
      const value = this.readString(); if (value === null) { this.p = p; return null }
      return {
        tp: MType.StringDict,
        key,
        value,
      };
    }

    case 52: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const name = this.readString(); if (name === null) { this.p = p; return null }
      const value = this.readString(); if (value === null) { this.p = p; return null }
      return {
        tp: MType.SetNodeAttributeDict,
        id,
        name,
        value,
      };
    }

    case 53: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      const ttfb = this.readUint(); if (ttfb === null) { this.p = p; return null }
      const headerSize = this.readUint(); if (headerSize === null) { this.p = p; return null }
      const encodedBodySize = this.readUint(); if (encodedBodySize === null) { this.p = p; return null }
      const decodedBodySize = this.readUint(); if (decodedBodySize === null) { this.p = p; return null }
      const url = this.readString(); if (url === null) { this.p = p; return null }
      const initiator = this.readString(); if (initiator === null) { this.p = p; return null }
      return {
        tp: MType.ResourceTimingDeprecatedDeprecated,
        timestamp,
        duration,
        ttfb,
        headerSize,
        encodedBodySize,
        decodedBodySize,
        url,
        initiator,
      };
    }

    case 54: {
      const downlink = this.readUint(); if (downlink === null) { this.p = p; return null }
      const type = this.readString(); if (type === null) { this.p = p; return null }
      return {
        tp: MType.ConnectionInformation,
        downlink,
        type,
      };
    }

    case 55: {
      const hidden = this.readBoolean(); if (hidden === null) { this.p = p; return null }
      return {
        tp: MType.SetPageVisibility,
        hidden,
      };
    }

    case 57: {
      const parentID = this.readUint(); if (parentID === null) { this.p = p; return null }
      const family = this.readString(); if (family === null) { this.p = p; return null }
      const source = this.readString(); if (source === null) { this.p = p; return null }
      const descriptors = this.readString(); if (descriptors === null) { this.p = p; return null }
      return {
        tp: MType.LoadFontFace,
        parentID,
        family,
        source,
        descriptors,
      };
    }

    case 58: {
      const id = this.readInt(); if (id === null) { this.p = p; return null }
      return {
        tp: MType.SetNodeFocus,
        id,
      };
    }

    case 60: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const name = this.readString(); if (name === null) { this.p = p; return null }
      const value = this.readString(); if (value === null) { this.p = p; return null }
      const baseURL = this.readString(); if (baseURL === null) { this.p = p; return null }
      return {
        tp: MType.SetNodeAttributeURLBased,
        id,
        name,
        value,
        baseURL,
      };
    }

    case 61: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const data = this.readString(); if (data === null) { this.p = p; return null }
      const baseURL = this.readString(); if (baseURL === null) { this.p = p; return null }
      return {
        tp: MType.SetCssDataURLBased,
        id,
        data,
        baseURL,
      };
    }

    case 65: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const slotID = this.readUint(); if (slotID === null) { this.p = p; return null }
      return {
        tp: MType.SetNodeSlot,
        id,
        slotID,
      };
    }

    case 68: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const hesitationTime = this.readUint(); if (hesitationTime === null) { this.p = p; return null }
      const label = this.readString(); if (label === null) { this.p = p; return null }
      const selector = this.readString(); if (selector === null) { this.p = p; return null }
      const normalizedX = this.readUint(); if (normalizedX === null) { this.p = p; return null }
      const normalizedY = this.readUint(); if (normalizedY === null) { this.p = p; return null }
      return {
        tp: MType.MouseClick,
        id,
        hesitationTime,
        label,
        selector,
        normalizedX,
        normalizedY,
      };
    }

    case 69: {
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      const hesitationTime = this.readUint(); if (hesitationTime === null) { this.p = p; return null }
      const label = this.readString(); if (label === null) { this.p = p; return null }
      const selector = this.readString(); if (selector === null) { this.p = p; return null }
      return {
        tp: MType.MouseClickDeprecated,
        id,
        hesitationTime,
        label,
        selector,
      };
    }

    case 70: {
      const frameID = this.readUint(); if (frameID === null) { this.p = p; return null }
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      return {
        tp: MType.CreateIFrameDocument,
        frameID,
        id,
      };
    }

    case 71: {
      const sheetID = this.readUint(); if (sheetID === null) { this.p = p; return null }
      const text = this.readString(); if (text === null) { this.p = p; return null }
      const baseURL = this.readString(); if (baseURL === null) { this.p = p; return null }
      return {
        tp: MType.AdoptedSsReplaceURLBased,
        sheetID,
        text,
        baseURL,
      };
    }

    case 72: {
      const sheetID = this.readUint(); if (sheetID === null) { this.p = p; return null }
      const text = this.readString(); if (text === null) { this.p = p; return null }
      return {
        tp: MType.AdoptedSsReplace,
        sheetID,
        text,
      };
    }

    case 73: {
      const sheetID = this.readUint(); if (sheetID === null) { this.p = p; return null }
      const rule = this.readString(); if (rule === null) { this.p = p; return null }
      const index = this.readUint(); if (index === null) { this.p = p; return null }
      const baseURL = this.readString(); if (baseURL === null) { this.p = p; return null }
      return {
        tp: MType.AdoptedSsInsertRuleURLBased,
        sheetID,
        rule,
        index,
        baseURL,
      };
    }

    case 74: {
      const sheetID = this.readUint(); if (sheetID === null) { this.p = p; return null }
      const rule = this.readString(); if (rule === null) { this.p = p; return null }
      const index = this.readUint(); if (index === null) { this.p = p; return null }
      return {
        tp: MType.AdoptedSsInsertRule,
        sheetID,
        rule,
        index,
      };
    }

    case 75: {
      const sheetID = this.readUint(); if (sheetID === null) { this.p = p; return null }
      const index = this.readUint(); if (index === null) { this.p = p; return null }
      return {
        tp: MType.AdoptedSsDeleteRule,
        sheetID,
        index,
      };
    }

    case 76: {
      const sheetID = this.readUint(); if (sheetID === null) { this.p = p; return null }
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      return {
        tp: MType.AdoptedSsAddOwner,
        sheetID,
        id,
      };
    }

    case 77: {
      const sheetID = this.readUint(); if (sheetID === null) { this.p = p; return null }
      const id = this.readUint(); if (id === null) { this.p = p; return null }
      return {
        tp: MType.AdoptedSsRemoveOwner,
        sheetID,
        id,
      };
    }

    case 79: {
      const mutation = this.readString(); if (mutation === null) { this.p = p; return null }
      const state = this.readString(); if (state === null) { this.p = p; return null }
      return {
        tp: MType.Zustand,
        mutation,
        state,
      };
    }

    case 83: {
      const type = this.readString(); if (type === null) { this.p = p; return null }
      const method = this.readString(); if (method === null) { this.p = p; return null }
      const url = this.readString(); if (url === null) { this.p = p; return null }
      const request = this.readString(); if (request === null) { this.p = p; return null }
      const response = this.readString(); if (response === null) { this.p = p; return null }
      const status = this.readUint(); if (status === null) { this.p = p; return null }
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      const transferredBodySize = this.readUint(); if (transferredBodySize === null) { this.p = p; return null }
      return {
        tp: MType.NetworkRequest,
        type,
        method,
        url,
        request,
        response,
        status,
        timestamp,
        duration,
        transferredBodySize,
      };
    }

    case 84: {
      const chType = this.readString(); if (chType === null) { this.p = p; return null }
      const channelName = this.readString(); if (channelName === null) { this.p = p; return null }
      const data = this.readString(); if (data === null) { this.p = p; return null }
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const dir = this.readString(); if (dir === null) { this.p = p; return null }
      const messageType = this.readString(); if (messageType === null) { this.p = p; return null }
      return {
        tp: MType.WsChannel,
        chType,
        channelName,
        data,
        timestamp,
        dir,
        messageType,
      };
    }

    case 85: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      const ttfb = this.readUint(); if (ttfb === null) { this.p = p; return null }
      const headerSize = this.readUint(); if (headerSize === null) { this.p = p; return null }
      const encodedBodySize = this.readUint(); if (encodedBodySize === null) { this.p = p; return null }
      const decodedBodySize = this.readUint(); if (decodedBodySize === null) { this.p = p; return null }
      const url = this.readString(); if (url === null) { this.p = p; return null }
      const initiator = this.readString(); if (initiator === null) { this.p = p; return null }
      const transferredSize = this.readUint(); if (transferredSize === null) { this.p = p; return null }
      const cached = this.readBoolean(); if (cached === null) { this.p = p; return null }
      const queueing = this.readUint(); if (queueing === null) { this.p = p; return null }
      const dnsLookup = this.readUint(); if (dnsLookup === null) { this.p = p; return null }
      const initialConnection = this.readUint(); if (initialConnection === null) { this.p = p; return null }
      const ssl = this.readUint(); if (ssl === null) { this.p = p; return null }
      const contentDownload = this.readUint(); if (contentDownload === null) { this.p = p; return null }
      const total = this.readUint(); if (total === null) { this.p = p; return null }
      const stalled = this.readUint(); if (stalled === null) { this.p = p; return null }
      return {
        tp: MType.ResourceTiming,
        timestamp,
        duration,
        ttfb,
        headerSize,
        encodedBodySize,
        decodedBodySize,
        url,
        initiator,
        transferredSize,
        cached,
        queueing,
        dnsLookup,
        initialConnection,
        ssl,
        contentDownload,
        total,
        stalled,
      };
    }

    case 87: {
      const label = this.readString(); if (label === null) { this.p = p; return null }
      const startTime = this.readInt(); if (startTime === null) { this.p = p; return null }
      const endTime = this.readInt(); if (endTime === null) { this.p = p; return null }
      return {
        tp: MType.Incident,
        label,
        startTime,
        endTime,
      };
    }

    case 89: {
      const name = this.readString(); if (name === null) { this.p = p; return null }
      const duration = this.readInt(); if (duration === null) { this.p = p; return null }
      const blockingDuration = this.readInt(); if (blockingDuration === null) { this.p = p; return null }
      const firstUIEventTimestamp = this.readInt(); if (firstUIEventTimestamp === null) { this.p = p; return null }
      const startTime = this.readInt(); if (startTime === null) { this.p = p; return null }
      const scripts = this.readString(); if (scripts === null) { this.p = p; return null }
      return {
        tp: MType.LongAnimationTask,
        name,
        duration,
        blockingDuration,
        firstUIEventTimestamp,
        startTime,
        scripts,
      };
    }

    case 113: {
      const selectionStart = this.readUint(); if (selectionStart === null) { this.p = p; return null }
      const selectionEnd = this.readUint(); if (selectionEnd === null) { this.p = p; return null }
      const selection = this.readString(); if (selection === null) { this.p = p; return null }
      return {
        tp: MType.SelectionChange,
        selectionStart,
        selectionEnd,
        selection,
      };
    }

    case 114: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      return {
        tp: MType.MouseThrashing,
        timestamp,
      };
    }

    case 116: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      const ttfb = this.readUint(); if (ttfb === null) { this.p = p; return null }
      const headerSize = this.readUint(); if (headerSize === null) { this.p = p; return null }
      const encodedBodySize = this.readUint(); if (encodedBodySize === null) { this.p = p; return null }
      const decodedBodySize = this.readUint(); if (decodedBodySize === null) { this.p = p; return null }
      const url = this.readString(); if (url === null) { this.p = p; return null }
      const initiator = this.readString(); if (initiator === null) { this.p = p; return null }
      const transferredSize = this.readUint(); if (transferredSize === null) { this.p = p; return null }
      const cached = this.readBoolean(); if (cached === null) { this.p = p; return null }
      return {
        tp: MType.ResourceTimingDeprecated,
        timestamp,
        duration,
        ttfb,
        headerSize,
        encodedBodySize,
        decodedBodySize,
        url,
        initiator,
        transferredSize,
        cached,
      };
    }

    case 117: {
      const tabId = this.readString(); if (tabId === null) { this.p = p; return null }
      return {
        tp: MType.TabChange,
        tabId,
      };
    }

    case 118: {
      const tabId = this.readString(); if (tabId === null) { this.p = p; return null }
      return {
        tp: MType.TabData,
        tabId,
      };
    }

    case 119: {
      const nodeId = this.readString(); if (nodeId === null) { this.p = p; return null }
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      return {
        tp: MType.CanvasNode,
        nodeId,
        timestamp,
      };
    }

    case 120: {
      const tagId = this.readInt(); if (tagId === null) { this.p = p; return null }
      return {
        tp: MType.TagTrigger,
        tagId,
      };
    }

    case 121: {
      const action = this.readString(); if (action === null) { this.p = p; return null }
      const state = this.readString(); if (state === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      const actionTime = this.readUint(); if (actionTime === null) { this.p = p; return null }
      return {
        tp: MType.Redux,
        action,
        state,
        duration,
        actionTime,
      };
    }

    case 122: {
      const url = this.readString(); if (url === null) { this.p = p; return null }
      const referrer = this.readString(); if (referrer === null) { this.p = p; return null }
      const navigationStart = this.readUint(); if (navigationStart === null) { this.p = p; return null }
      const documentTitle = this.readString(); if (documentTitle === null) { this.p = p; return null }
      return {
        tp: MType.SetPageLocation,
        url,
        referrer,
        navigationStart,
        documentTitle,
      };
    }

    case 123: {
      const operationKind = this.readString(); if (operationKind === null) { this.p = p; return null }
      const operationName = this.readString(); if (operationName === null) { this.p = p; return null }
      const variables = this.readString(); if (variables === null) { this.p = p; return null }
      const response = this.readString(); if (response === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      return {
        tp: MType.GraphQl,
        operationKind,
        operationName,
        variables,
        response,
        duration,
      };
    }

    case 93: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const length = this.readUint(); if (length === null) { this.p = p; return null }
      const name = this.readString(); if (name === null) { this.p = p; return null }
      const payload = this.readString(); if (payload === null) { this.p = p; return null }
      return {
        tp: MType.MobileEvent,
        timestamp,
        length,
        name,
        payload,
      };
    }

    case 96: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const length = this.readUint(); if (length === null) { this.p = p; return null }
      const x = this.readUint(); if (x === null) { this.p = p; return null }
      const y = this.readUint(); if (y === null) { this.p = p; return null }
      const width = this.readUint(); if (width === null) { this.p = p; return null }
      const height = this.readUint(); if (height === null) { this.p = p; return null }
      return {
        tp: MType.MobileScreenChanges,
        timestamp,
        length,
        x,
        y,
        width,
        height,
      };
    }

    case 100: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const length = this.readUint(); if (length === null) { this.p = p; return null }
      const label = this.readString(); if (label === null) { this.p = p; return null }
      const x = this.readUint(); if (x === null) { this.p = p; return null }
      const y = this.readUint(); if (y === null) { this.p = p; return null }
      return {
        tp: MType.MobileClickEvent,
        timestamp,
        length,
        label,
        x,
        y,
      };
    }

    case 101: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const length = this.readUint(); if (length === null) { this.p = p; return null }
      const value = this.readString(); if (value === null) { this.p = p; return null }
      const valueMasked = this.readBoolean(); if (valueMasked === null) { this.p = p; return null }
      const label = this.readString(); if (label === null) { this.p = p; return null }
      return {
        tp: MType.MobileInputEvent,
        timestamp,
        length,
        value,
        valueMasked,
        label,
      };
    }

    case 102: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const length = this.readUint(); if (length === null) { this.p = p; return null }
      const name = this.readString(); if (name === null) { this.p = p; return null }
      const value = this.readUint(); if (value === null) { this.p = p; return null }
      return {
        tp: MType.MobilePerformanceEvent,
        timestamp,
        length,
        name,
        value,
      };
    }

    case 103: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const length = this.readUint(); if (length === null) { this.p = p; return null }
      const severity = this.readString(); if (severity === null) { this.p = p; return null }
      const content = this.readString(); if (content === null) { this.p = p; return null }
      return {
        tp: MType.MobileLog,
        timestamp,
        length,
        severity,
        content,
      };
    }

    case 104: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const length = this.readUint(); if (length === null) { this.p = p; return null }
      const content = this.readString(); if (content === null) { this.p = p; return null }
      return {
        tp: MType.MobileInternalError,
        timestamp,
        length,
        content,
      };
    }

    case 105: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const length = this.readUint(); if (length === null) { this.p = p; return null }
      const type = this.readString(); if (type === null) { this.p = p; return null }
      const method = this.readString(); if (method === null) { this.p = p; return null }
      const url = this.readString(); if (url === null) { this.p = p; return null }
      const request = this.readString(); if (request === null) { this.p = p; return null }
      const response = this.readString(); if (response === null) { this.p = p; return null }
      const status = this.readUint(); if (status === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      return {
        tp: MType.MobileNetworkCall,
        timestamp,
        length,
        type,
        method,
        url,
        request,
        response,
        status,
        duration,
      };
    }

    case 106: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const length = this.readUint(); if (length === null) { this.p = p; return null }
      const label = this.readString(); if (label === null) { this.p = p; return null }
      const x = this.readUint(); if (x === null) { this.p = p; return null }
      const y = this.readUint(); if (y === null) { this.p = p; return null }
      const direction = this.readString(); if (direction === null) { this.p = p; return null }
      return {
        tp: MType.MobileSwipeEvent,
        timestamp,
        length,
        label,
        x,
        y,
        direction,
      };
    }

    case 107: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const length = this.readUint(); if (length === null) { this.p = p; return null }
      const firstIndex = this.readUint(); if (firstIndex === null) { this.p = p; return null }
      return {
        tp: MType.MobileBatchMeta,
        timestamp,
        length,
        firstIndex,
      };
    }

    case 109: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const length = this.readUint(); if (length === null) { this.p = p; return null }
      const operationKind = this.readString(); if (operationKind === null) { this.p = p; return null }
      const operationName = this.readString(); if (operationName === null) { this.p = p; return null }
      const variables = this.readString(); if (variables === null) { this.p = p; return null }
      const response = this.readString(); if (response === null) { this.p = p; return null }
      const duration = this.readUint(); if (duration === null) { this.p = p; return null }
      return {
        tp: MType.MobileGraphQl,
        timestamp,
        length,
        operationKind,
        operationName,
        variables,
        response,
        duration,
      };
    }

    case 111: {
      const timestamp = this.readUint(); if (timestamp === null) { this.p = p; return null }
      const type = this.readString(); if (type === null) { this.p = p; return null }
      const contextString = this.readString(); if (contextString === null) { this.p = p; return null }
      const context = this.readString(); if (context === null) { this.p = p; return null }
      const payload = this.readString(); if (payload === null) { this.p = p; return null }
      return {
        tp: MType.MobileIssueEvent,
        timestamp,
        type,
        contextString,
        context,
        payload,
      };
    }

    default:
      console.debug(
        `Unrecognized tp=${tp}, msg started at ${p}, pointer now at ${this.p}, buf length ${this.buf.length}`,
        '\n250 bytes before msg start:\n', this.buf.slice(Math.max(0, p - 250), p).join(' '),
        '\n250 bytes from msg start:\n', this.buf.slice(p, p + 250).join(' '),
      )
      throw new Error(`Unrecognizable message type: ${ tp }; Pointer at the position ${this.p} of ${this.buf.length}`)
    }
  }
}
