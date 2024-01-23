// Auto-generated, do not edit
/* eslint-disable */

import PrimitiveReader from './PrimitiveReader'
import { MType } from './raw.gen'
import type { RawMessage } from './raw.gen'


export default class RawMessageReader extends PrimitiveReader {
  readMessage(): RawMessage | null {
    const p = this.p
    const resetPointer = () => {
      this.p = p
      return null
    }

    const tp = this.readUint()
    if (tp === null) { return resetPointer() }

    switch (tp) {

    case 0: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      return {
        tp: MType.Timestamp,
        timestamp,
      };
    }

    case 4: {
      const url = this.readString(); if (url === null) { return resetPointer() }
      const referrer = this.readString(); if (referrer === null) { return resetPointer() }
      const navigationStart = this.readUint(); if (navigationStart === null) { return resetPointer() }
      return {
        tp: MType.SetPageLocation,
        url,
        referrer,
        navigationStart,
      };
    }

    case 5: {
      const width = this.readUint(); if (width === null) { return resetPointer() }
      const height = this.readUint(); if (height === null) { return resetPointer() }
      return {
        tp: MType.SetViewportSize,
        width,
        height,
      };
    }

    case 6: {
      const x = this.readInt(); if (x === null) { return resetPointer() }
      const y = this.readInt(); if (y === null) { return resetPointer() }
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
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const parentID = this.readUint(); if (parentID === null) { return resetPointer() }
      const index = this.readUint(); if (index === null) { return resetPointer() }
      const tag = this.readString(); if (tag === null) { return resetPointer() }
      const svg = this.readBoolean(); if (svg === null) { return resetPointer() }
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
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const parentID = this.readUint(); if (parentID === null) { return resetPointer() }
      const index = this.readUint(); if (index === null) { return resetPointer() }
      return {
        tp: MType.CreateTextNode,
        id,
        parentID,
        index,
      };
    }

    case 10: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const parentID = this.readUint(); if (parentID === null) { return resetPointer() }
      const index = this.readUint(); if (index === null) { return resetPointer() }
      return {
        tp: MType.MoveNode,
        id,
        parentID,
        index,
      };
    }

    case 11: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      return {
        tp: MType.RemoveNode,
        id,
      };
    }

    case 12: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const name = this.readString(); if (name === null) { return resetPointer() }
      const value = this.readString(); if (value === null) { return resetPointer() }
      return {
        tp: MType.SetNodeAttribute,
        id,
        name,
        value,
      };
    }

    case 13: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const name = this.readString(); if (name === null) { return resetPointer() }
      return {
        tp: MType.RemoveNodeAttribute,
        id,
        name,
      };
    }

    case 14: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const data = this.readString(); if (data === null) { return resetPointer() }
      return {
        tp: MType.SetNodeData,
        id,
        data,
      };
    }

    case 15: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const data = this.readString(); if (data === null) { return resetPointer() }
      return {
        tp: MType.SetCssData,
        id,
        data,
      };
    }

    case 16: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const x = this.readInt(); if (x === null) { return resetPointer() }
      const y = this.readInt(); if (y === null) { return resetPointer() }
      return {
        tp: MType.SetNodeScroll,
        id,
        x,
        y,
      };
    }

    case 18: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const value = this.readString(); if (value === null) { return resetPointer() }
      const mask = this.readInt(); if (mask === null) { return resetPointer() }
      return {
        tp: MType.SetInputValue,
        id,
        value,
        mask,
      };
    }

    case 19: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const checked = this.readBoolean(); if (checked === null) { return resetPointer() }
      return {
        tp: MType.SetInputChecked,
        id,
        checked,
      };
    }

    case 20: {
      const x = this.readUint(); if (x === null) { return resetPointer() }
      const y = this.readUint(); if (y === null) { return resetPointer() }
      return {
        tp: MType.MouseMove,
        x,
        y,
      };
    }

    case 21: {
      const type = this.readString(); if (type === null) { return resetPointer() }
      const method = this.readString(); if (method === null) { return resetPointer() }
      const url = this.readString(); if (url === null) { return resetPointer() }
      const request = this.readString(); if (request === null) { return resetPointer() }
      const response = this.readString(); if (response === null) { return resetPointer() }
      const status = this.readUint(); if (status === null) { return resetPointer() }
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const duration = this.readUint(); if (duration === null) { return resetPointer() }
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
      const level = this.readString(); if (level === null) { return resetPointer() }
      const value = this.readString(); if (value === null) { return resetPointer() }
      return {
        tp: MType.ConsoleLog,
        level,
        value,
      };
    }

    case 37: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const rule = this.readString(); if (rule === null) { return resetPointer() }
      const index = this.readUint(); if (index === null) { return resetPointer() }
      return {
        tp: MType.CssInsertRule,
        id,
        rule,
        index,
      };
    }

    case 38: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const index = this.readUint(); if (index === null) { return resetPointer() }
      return {
        tp: MType.CssDeleteRule,
        id,
        index,
      };
    }

    case 39: {
      const method = this.readString(); if (method === null) { return resetPointer() }
      const url = this.readString(); if (url === null) { return resetPointer() }
      const request = this.readString(); if (request === null) { return resetPointer() }
      const response = this.readString(); if (response === null) { return resetPointer() }
      const status = this.readUint(); if (status === null) { return resetPointer() }
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const duration = this.readUint(); if (duration === null) { return resetPointer() }
      return {
        tp: MType.Fetch,
        method,
        url,
        request,
        response,
        status,
        timestamp,
        duration,
      };
    }

    case 40: {
      const name = this.readString(); if (name === null) { return resetPointer() }
      const duration = this.readUint(); if (duration === null) { return resetPointer() }
      const args = this.readString(); if (args === null) { return resetPointer() }
      const result = this.readString(); if (result === null) { return resetPointer() }
      return {
        tp: MType.Profiler,
        name,
        duration,
        args,
        result,
      };
    }

    case 41: {
      const key = this.readString(); if (key === null) { return resetPointer() }
      const value = this.readString(); if (value === null) { return resetPointer() }
      return {
        tp: MType.OTable,
        key,
        value,
      };
    }

    case 44: {
      const action = this.readString(); if (action === null) { return resetPointer() }
      const state = this.readString(); if (state === null) { return resetPointer() }
      const duration = this.readUint(); if (duration === null) { return resetPointer() }
      return {
        tp: MType.Redux,
        action,
        state,
        duration,
      };
    }

    case 45: {
      const mutation = this.readString(); if (mutation === null) { return resetPointer() }
      const state = this.readString(); if (state === null) { return resetPointer() }
      return {
        tp: MType.Vuex,
        mutation,
        state,
      };
    }

    case 46: {
      const type = this.readString(); if (type === null) { return resetPointer() }
      const payload = this.readString(); if (payload === null) { return resetPointer() }
      return {
        tp: MType.MobX,
        type,
        payload,
      };
    }

    case 47: {
      const action = this.readString(); if (action === null) { return resetPointer() }
      const state = this.readString(); if (state === null) { return resetPointer() }
      const duration = this.readUint(); if (duration === null) { return resetPointer() }
      return {
        tp: MType.NgRx,
        action,
        state,
        duration,
      };
    }

    case 48: {
      const operationKind = this.readString(); if (operationKind === null) { return resetPointer() }
      const operationName = this.readString(); if (operationName === null) { return resetPointer() }
      const variables = this.readString(); if (variables === null) { return resetPointer() }
      const response = this.readString(); if (response === null) { return resetPointer() }
      const duration = this.readInt(); if (duration === null) { return resetPointer() }
      return {
        tp: MType.GraphQl,
        operationKind,
        operationName,
        variables,
        response,
        duration,
      };
    }

    case 49: {
      const frames = this.readInt(); if (frames === null) { return resetPointer() }
      const ticks = this.readInt(); if (ticks === null) { return resetPointer() }
      const totalJSHeapSize = this.readUint(); if (totalJSHeapSize === null) { return resetPointer() }
      const usedJSHeapSize = this.readUint(); if (usedJSHeapSize === null) { return resetPointer() }
      return {
        tp: MType.PerformanceTrack,
        frames,
        ticks,
        totalJSHeapSize,
        usedJSHeapSize,
      };
    }

    case 50: {
      const key = this.readUint(); if (key === null) { return resetPointer() }
      const value = this.readString(); if (value === null) { return resetPointer() }
      return {
        tp: MType.StringDict,
        key,
        value,
      };
    }

    case 51: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const nameKey = this.readUint(); if (nameKey === null) { return resetPointer() }
      const valueKey = this.readUint(); if (valueKey === null) { return resetPointer() }
      return {
        tp: MType.SetNodeAttributeDict,
        id,
        nameKey,
        valueKey,
      };
    }

    case 53: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const duration = this.readUint(); if (duration === null) { return resetPointer() }
      const ttfb = this.readUint(); if (ttfb === null) { return resetPointer() }
      const headerSize = this.readUint(); if (headerSize === null) { return resetPointer() }
      const encodedBodySize = this.readUint(); if (encodedBodySize === null) { return resetPointer() }
      const decodedBodySize = this.readUint(); if (decodedBodySize === null) { return resetPointer() }
      const url = this.readString(); if (url === null) { return resetPointer() }
      const initiator = this.readString(); if (initiator === null) { return resetPointer() }
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
      };
    }

    case 54: {
      const downlink = this.readUint(); if (downlink === null) { return resetPointer() }
      const type = this.readString(); if (type === null) { return resetPointer() }
      return {
        tp: MType.ConnectionInformation,
        downlink,
        type,
      };
    }

    case 55: {
      const hidden = this.readBoolean(); if (hidden === null) { return resetPointer() }
      return {
        tp: MType.SetPageVisibility,
        hidden,
      };
    }

    case 57: {
      const parentID = this.readUint(); if (parentID === null) { return resetPointer() }
      const family = this.readString(); if (family === null) { return resetPointer() }
      const source = this.readString(); if (source === null) { return resetPointer() }
      const descriptors = this.readString(); if (descriptors === null) { return resetPointer() }
      return {
        tp: MType.LoadFontFace,
        parentID,
        family,
        source,
        descriptors,
      };
    }

    case 58: {
      const id = this.readInt(); if (id === null) { return resetPointer() }
      return {
        tp: MType.SetNodeFocus,
        id,
      };
    }

    case 59: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const duration = this.readUint(); if (duration === null) { return resetPointer() }
      const context = this.readUint(); if (context === null) { return resetPointer() }
      const containerType = this.readUint(); if (containerType === null) { return resetPointer() }
      const containerSrc = this.readString(); if (containerSrc === null) { return resetPointer() }
      const containerId = this.readString(); if (containerId === null) { return resetPointer() }
      const containerName = this.readString(); if (containerName === null) { return resetPointer() }
      return {
        tp: MType.LongTask,
        timestamp,
        duration,
        context,
        containerType,
        containerSrc,
        containerId,
        containerName,
      };
    }

    case 60: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const name = this.readString(); if (name === null) { return resetPointer() }
      const value = this.readString(); if (value === null) { return resetPointer() }
      const baseURL = this.readString(); if (baseURL === null) { return resetPointer() }
      return {
        tp: MType.SetNodeAttributeURLBased,
        id,
        name,
        value,
        baseURL,
      };
    }

    case 61: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const data = this.readString(); if (data === null) { return resetPointer() }
      const baseURL = this.readString(); if (baseURL === null) { return resetPointer() }
      return {
        tp: MType.SetCssDataURLBased,
        id,
        data,
        baseURL,
      };
    }

    case 67: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const rule = this.readString(); if (rule === null) { return resetPointer() }
      const index = this.readUint(); if (index === null) { return resetPointer() }
      const baseURL = this.readString(); if (baseURL === null) { return resetPointer() }
      return {
        tp: MType.CssInsertRuleURLBased,
        id,
        rule,
        index,
        baseURL,
      };
    }

    case 69: {
      const id = this.readUint(); if (id === null) { return resetPointer() }
      const hesitationTime = this.readUint(); if (hesitationTime === null) { return resetPointer() }
      const label = this.readString(); if (label === null) { return resetPointer() }
      const selector = this.readString(); if (selector === null) { return resetPointer() }
      return {
        tp: MType.MouseClick,
        id,
        hesitationTime,
        label,
        selector,
      };
    }

    case 70: {
      const frameID = this.readUint(); if (frameID === null) { return resetPointer() }
      const id = this.readUint(); if (id === null) { return resetPointer() }
      return {
        tp: MType.CreateIFrameDocument,
        frameID,
        id,
      };
    }

    case 71: {
      const sheetID = this.readUint(); if (sheetID === null) { return resetPointer() }
      const text = this.readString(); if (text === null) { return resetPointer() }
      const baseURL = this.readString(); if (baseURL === null) { return resetPointer() }
      return {
        tp: MType.AdoptedSsReplaceURLBased,
        sheetID,
        text,
        baseURL,
      };
    }

    case 72: {
      const sheetID = this.readUint(); if (sheetID === null) { return resetPointer() }
      const text = this.readString(); if (text === null) { return resetPointer() }
      return {
        tp: MType.AdoptedSsReplace,
        sheetID,
        text,
      };
    }

    case 73: {
      const sheetID = this.readUint(); if (sheetID === null) { return resetPointer() }
      const rule = this.readString(); if (rule === null) { return resetPointer() }
      const index = this.readUint(); if (index === null) { return resetPointer() }
      const baseURL = this.readString(); if (baseURL === null) { return resetPointer() }
      return {
        tp: MType.AdoptedSsInsertRuleURLBased,
        sheetID,
        rule,
        index,
        baseURL,
      };
    }

    case 74: {
      const sheetID = this.readUint(); if (sheetID === null) { return resetPointer() }
      const rule = this.readString(); if (rule === null) { return resetPointer() }
      const index = this.readUint(); if (index === null) { return resetPointer() }
      return {
        tp: MType.AdoptedSsInsertRule,
        sheetID,
        rule,
        index,
      };
    }

    case 75: {
      const sheetID = this.readUint(); if (sheetID === null) { return resetPointer() }
      const index = this.readUint(); if (index === null) { return resetPointer() }
      return {
        tp: MType.AdoptedSsDeleteRule,
        sheetID,
        index,
      };
    }

    case 76: {
      const sheetID = this.readUint(); if (sheetID === null) { return resetPointer() }
      const id = this.readUint(); if (id === null) { return resetPointer() }
      return {
        tp: MType.AdoptedSsAddOwner,
        sheetID,
        id,
      };
    }

    case 77: {
      const sheetID = this.readUint(); if (sheetID === null) { return resetPointer() }
      const id = this.readUint(); if (id === null) { return resetPointer() }
      return {
        tp: MType.AdoptedSsRemoveOwner,
        sheetID,
        id,
      };
    }

    case 79: {
      const mutation = this.readString(); if (mutation === null) { return resetPointer() }
      const state = this.readString(); if (state === null) { return resetPointer() }
      return {
        tp: MType.Zustand,
        mutation,
        state,
      };
    }

    case 83: {
      const type = this.readString(); if (type === null) { return resetPointer() }
      const method = this.readString(); if (method === null) { return resetPointer() }
      const url = this.readString(); if (url === null) { return resetPointer() }
      const request = this.readString(); if (request === null) { return resetPointer() }
      const response = this.readString(); if (response === null) { return resetPointer() }
      const status = this.readUint(); if (status === null) { return resetPointer() }
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const duration = this.readUint(); if (duration === null) { return resetPointer() }
      const transferredBodySize = this.readUint(); if (transferredBodySize === null) { return resetPointer() }
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
      const chType = this.readString(); if (chType === null) { return resetPointer() }
      const channelName = this.readString(); if (channelName === null) { return resetPointer() }
      const data = this.readString(); if (data === null) { return resetPointer() }
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const dir = this.readString(); if (dir === null) { return resetPointer() }
      const messageType = this.readString(); if (messageType === null) { return resetPointer() }
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

    case 113: {
      const selectionStart = this.readUint(); if (selectionStart === null) { return resetPointer() }
      const selectionEnd = this.readUint(); if (selectionEnd === null) { return resetPointer() }
      const selection = this.readString(); if (selection === null) { return resetPointer() }
      return {
        tp: MType.SelectionChange,
        selectionStart,
        selectionEnd,
        selection,
      };
    }

    case 114: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      return {
        tp: MType.MouseThrashing,
        timestamp,
      };
    }

    case 116: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const duration = this.readUint(); if (duration === null) { return resetPointer() }
      const ttfb = this.readUint(); if (ttfb === null) { return resetPointer() }
      const headerSize = this.readUint(); if (headerSize === null) { return resetPointer() }
      const encodedBodySize = this.readUint(); if (encodedBodySize === null) { return resetPointer() }
      const decodedBodySize = this.readUint(); if (decodedBodySize === null) { return resetPointer() }
      const url = this.readString(); if (url === null) { return resetPointer() }
      const initiator = this.readString(); if (initiator === null) { return resetPointer() }
      const transferredSize = this.readUint(); if (transferredSize === null) { return resetPointer() }
      const cached = this.readBoolean(); if (cached === null) { return resetPointer() }
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
      };
    }

    case 117: {
      const tabId = this.readString(); if (tabId === null) { return resetPointer() }
      return {
        tp: MType.TabChange,
        tabId,
      };
    }

    case 118: {
      const tabId = this.readString(); if (tabId === null) { return resetPointer() }
      return {
        tp: MType.TabData,
        tabId,
      };
    }

    case 119: {
      const nodeId = this.readString(); if (nodeId === null) { return resetPointer() }
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      return {
        tp: MType.CanvasNode,
        nodeId,
        timestamp,
      };
    }

    case 120: {
      const tagId = this.readInt(); if (tagId === null) { return resetPointer() }
      return {
        tp: MType.TagTrigger,
        tagId,
      };
    }

    case 93: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const length = this.readUint(); if (length === null) { return resetPointer() }
      const name = this.readString(); if (name === null) { return resetPointer() }
      const payload = this.readString(); if (payload === null) { return resetPointer() }
      return {
        tp: MType.IosEvent,
        timestamp,
        length,
        name,
        payload,
      };
    }

    case 96: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const length = this.readUint(); if (length === null) { return resetPointer() }
      const x = this.readUint(); if (x === null) { return resetPointer() }
      const y = this.readUint(); if (y === null) { return resetPointer() }
      const width = this.readUint(); if (width === null) { return resetPointer() }
      const height = this.readUint(); if (height === null) { return resetPointer() }
      return {
        tp: MType.IosScreenChanges,
        timestamp,
        length,
        x,
        y,
        width,
        height,
      };
    }

    case 100: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const length = this.readUint(); if (length === null) { return resetPointer() }
      const label = this.readString(); if (label === null) { return resetPointer() }
      const x = this.readUint(); if (x === null) { return resetPointer() }
      const y = this.readUint(); if (y === null) { return resetPointer() }
      return {
        tp: MType.IosClickEvent,
        timestamp,
        length,
        label,
        x,
        y,
      };
    }

    case 101: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const length = this.readUint(); if (length === null) { return resetPointer() }
      const value = this.readString(); if (value === null) { return resetPointer() }
      const valueMasked = this.readBoolean(); if (valueMasked === null) { return resetPointer() }
      const label = this.readString(); if (label === null) { return resetPointer() }
      return {
        tp: MType.IosInputEvent,
        timestamp,
        length,
        value,
        valueMasked,
        label,
      };
    }

    case 102: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const length = this.readUint(); if (length === null) { return resetPointer() }
      const name = this.readString(); if (name === null) { return resetPointer() }
      const value = this.readUint(); if (value === null) { return resetPointer() }
      return {
        tp: MType.IosPerformanceEvent,
        timestamp,
        length,
        name,
        value,
      };
    }

    case 103: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const length = this.readUint(); if (length === null) { return resetPointer() }
      const severity = this.readString(); if (severity === null) { return resetPointer() }
      const content = this.readString(); if (content === null) { return resetPointer() }
      return {
        tp: MType.IosLog,
        timestamp,
        length,
        severity,
        content,
      };
    }

    case 104: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const length = this.readUint(); if (length === null) { return resetPointer() }
      const content = this.readString(); if (content === null) { return resetPointer() }
      return {
        tp: MType.IosInternalError,
        timestamp,
        length,
        content,
      };
    }

    case 105: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const length = this.readUint(); if (length === null) { return resetPointer() }
      const type = this.readString(); if (type === null) { return resetPointer() }
      const method = this.readString(); if (method === null) { return resetPointer() }
      const url = this.readString(); if (url === null) { return resetPointer() }
      const request = this.readString(); if (request === null) { return resetPointer() }
      const response = this.readString(); if (response === null) { return resetPointer() }
      const status = this.readUint(); if (status === null) { return resetPointer() }
      const duration = this.readUint(); if (duration === null) { return resetPointer() }
      return {
        tp: MType.IosNetworkCall,
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
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const length = this.readUint(); if (length === null) { return resetPointer() }
      const label = this.readString(); if (label === null) { return resetPointer() }
      const x = this.readUint(); if (x === null) { return resetPointer() }
      const y = this.readUint(); if (y === null) { return resetPointer() }
      const direction = this.readString(); if (direction === null) { return resetPointer() }
      return {
        tp: MType.IosSwipeEvent,
        timestamp,
        length,
        label,
        x,
        y,
        direction,
      };
    }

    case 111: {
      const timestamp = this.readUint(); if (timestamp === null) { return resetPointer() }
      const type = this.readString(); if (type === null) { return resetPointer() }
      const contextString = this.readString(); if (contextString === null) { return resetPointer() }
      const context = this.readString(); if (context === null) { return resetPointer() }
      const payload = this.readString(); if (payload === null) { return resetPointer() }
      return {
        tp: MType.IosIssueEvent,
        timestamp,
        type,
        contextString,
        context,
        payload,
      };
    }

    default:
      throw new Error(`Unrecognizable message type: ${ tp }; Pointer at the position ${this.p} of ${this.buf.length}`)
      return null;
    }
  }
}
