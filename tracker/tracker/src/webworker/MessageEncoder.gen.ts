// Auto-generated, do not edit
// @ts-nocheck
/* eslint-disable */

import * as Messages from '../common/messages.gen.js'
import Message from '../common/messages.gen.js'
import PrimitiveEncoder from './PrimitiveEncoder.js'


export default class MessageEncoder extends PrimitiveEncoder {
  encode(msg: Message, isCompressed?: boolean): boolean {
    if (isCompressed) {
        switch(msg[0]) {
        
            case Messages.Type.Timestamp:
              return  this.encodeCompressed(msg[1])
            break
        
            case Messages.Type.SetPageLocation:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.SetViewportSize:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.SetViewportScroll:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.CreateDocument:
              return  true 
            break
        
            case Messages.Type.CreateElementNode:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4]) && this.encodeCompressed(msg[5])
            break
        
            case Messages.Type.CreateTextNode:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.MoveNode:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.RemoveNode:
              return  this.encodeCompressed(msg[1])
            break
        
            case Messages.Type.SetNodeAttribute:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.RemoveNodeAttribute:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.SetNodeData:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.SetNodeScroll:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.SetInputTarget:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.SetInputValue:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.SetInputChecked:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.MouseMove:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.NetworkRequest:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4]) && this.encodeCompressed(msg[5]) && this.encodeCompressed(msg[6]) && this.encodeCompressed(msg[7]) && this.encodeCompressed(msg[8])
            break
        
            case Messages.Type.ConsoleLog:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.PageLoadTiming:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4]) && this.encodeCompressed(msg[5]) && this.encodeCompressed(msg[6]) && this.encodeCompressed(msg[7]) && this.encodeCompressed(msg[8]) && this.encodeCompressed(msg[9])
            break
        
            case Messages.Type.PageRenderTiming:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.CustomEvent:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.UserID:
              return  this.encodeCompressed(msg[1])
            break
        
            case Messages.Type.UserAnonymousID:
              return  this.encodeCompressed(msg[1])
            break
        
            case Messages.Type.Metadata:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.CSSInsertRule:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.CSSDeleteRule:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.Fetch:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4]) && this.encodeCompressed(msg[5]) && this.encodeCompressed(msg[6]) && this.encodeCompressed(msg[7])
            break
        
            case Messages.Type.Profiler:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4])
            break
        
            case Messages.Type.OTable:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.StateAction:
              return  this.encodeCompressed(msg[1])
            break
        
            case Messages.Type.Redux:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.Vuex:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.MobX:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.NgRx:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.GraphQL:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4])
            break
        
            case Messages.Type.PerformanceTrack:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4])
            break
        
            case Messages.Type.StringDict:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.SetNodeAttributeDict:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.ResourceTimingDeprecated:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4]) && this.encodeCompressed(msg[5]) && this.encodeCompressed(msg[6]) && this.encodeCompressed(msg[7]) && this.encodeCompressed(msg[8])
            break
        
            case Messages.Type.ConnectionInformation:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.SetPageVisibility:
              return  this.encodeCompressed(msg[1])
            break
        
            case Messages.Type.LoadFontFace:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4])
            break
        
            case Messages.Type.SetNodeFocus:
              return  this.encodeCompressed(msg[1])
            break
        
            case Messages.Type.LongTask:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4]) && this.encodeCompressed(msg[5]) && this.encodeCompressed(msg[6]) && this.encodeCompressed(msg[7])
            break
        
            case Messages.Type.SetNodeAttributeURLBased:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4])
            break
        
            case Messages.Type.SetCSSDataURLBased:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.TechnicalInfo:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.CustomIssue:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.CSSInsertRuleURLBased:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4])
            break
        
            case Messages.Type.MouseClick:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4])
            break
        
            case Messages.Type.CreateIFrameDocument:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.AdoptedSSReplaceURLBased:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.AdoptedSSInsertRuleURLBased:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4])
            break
        
            case Messages.Type.AdoptedSSDeleteRule:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.AdoptedSSAddOwner:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.AdoptedSSRemoveOwner:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.JSException:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4])
            break
        
            case Messages.Type.Zustand:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.BatchMetadata:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4]) && this.encodeCompressed(msg[5])
            break
        
            case Messages.Type.PartitionedMessage:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2])
            break
        
            case Messages.Type.InputChange:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4]) && this.encodeCompressed(msg[5]) && this.encodeCompressed(msg[6])
            break
        
            case Messages.Type.SelectionChange:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3])
            break
        
            case Messages.Type.MouseThrashing:
              return  this.encodeCompressed(msg[1])
            break
        
            case Messages.Type.UnbindNodes:
              return  this.encodeCompressed(msg[1])
            break
        
            case Messages.Type.ResourceTiming:
              return  this.encodeCompressed(msg[1]) && this.encodeCompressed(msg[2]) && this.encodeCompressed(msg[3]) && this.encodeCompressed(msg[4]) && this.encodeCompressed(msg[5]) && this.encodeCompressed(msg[6]) && this.encodeCompressed(msg[7]) && this.encodeCompressed(msg[8]) && this.encodeCompressed(msg[9]) && this.encodeCompressed(msg[10])
            break
        
        }
    }
    switch(msg[0]) {

    case Messages.Type.Timestamp:
      return  this.uint(msg[1])
    break

    case Messages.Type.SetPageLocation:
      return  this.string(msg[1]) && this.string(msg[2]) && this.uint(msg[3])
    break

    case Messages.Type.SetViewportSize:
      return  this.uint(msg[1]) && this.uint(msg[2])
    break

    case Messages.Type.SetViewportScroll:
      return  this.int(msg[1]) && this.int(msg[2])
    break

    case Messages.Type.CreateDocument:
      return  true 
    break

    case Messages.Type.CreateElementNode:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3]) && this.string(msg[4]) && this.boolean(msg[5])
    break

    case Messages.Type.CreateTextNode:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3])
    break

    case Messages.Type.MoveNode:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3])
    break

    case Messages.Type.RemoveNode:
      return  this.uint(msg[1])
    break

    case Messages.Type.SetNodeAttribute:
      return  this.uint(msg[1]) && this.string(msg[2]) && this.string(msg[3])
    break

    case Messages.Type.RemoveNodeAttribute:
      return  this.uint(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.SetNodeData:
      return  this.uint(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.SetNodeScroll:
      return  this.uint(msg[1]) && this.int(msg[2]) && this.int(msg[3])
    break

    case Messages.Type.SetInputTarget:
      return  this.uint(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.SetInputValue:
      return  this.uint(msg[1]) && this.string(msg[2]) && this.int(msg[3])
    break

    case Messages.Type.SetInputChecked:
      return  this.uint(msg[1]) && this.boolean(msg[2])
    break

    case Messages.Type.MouseMove:
      return  this.uint(msg[1]) && this.uint(msg[2])
    break

    case Messages.Type.NetworkRequest:
      return  this.string(msg[1]) && this.string(msg[2]) && this.string(msg[3]) && this.string(msg[4]) && this.string(msg[5]) && this.uint(msg[6]) && this.uint(msg[7]) && this.uint(msg[8])
    break

    case Messages.Type.ConsoleLog:
      return  this.string(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.PageLoadTiming:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3]) && this.uint(msg[4]) && this.uint(msg[5]) && this.uint(msg[6]) && this.uint(msg[7]) && this.uint(msg[8]) && this.uint(msg[9])
    break

    case Messages.Type.PageRenderTiming:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3])
    break

    case Messages.Type.CustomEvent:
      return  this.string(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.UserID:
      return  this.string(msg[1])
    break

    case Messages.Type.UserAnonymousID:
      return  this.string(msg[1])
    break

    case Messages.Type.Metadata:
      return  this.string(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.CSSInsertRule:
      return  this.uint(msg[1]) && this.string(msg[2]) && this.uint(msg[3])
    break

    case Messages.Type.CSSDeleteRule:
      return  this.uint(msg[1]) && this.uint(msg[2])
    break

    case Messages.Type.Fetch:
      return  this.string(msg[1]) && this.string(msg[2]) && this.string(msg[3]) && this.string(msg[4]) && this.uint(msg[5]) && this.uint(msg[6]) && this.uint(msg[7])
    break

    case Messages.Type.Profiler:
      return  this.string(msg[1]) && this.uint(msg[2]) && this.string(msg[3]) && this.string(msg[4])
    break

    case Messages.Type.OTable:
      return  this.string(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.StateAction:
      return  this.string(msg[1])
    break

    case Messages.Type.Redux:
      return  this.string(msg[1]) && this.string(msg[2]) && this.uint(msg[3])
    break

    case Messages.Type.Vuex:
      return  this.string(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.MobX:
      return  this.string(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.NgRx:
      return  this.string(msg[1]) && this.string(msg[2]) && this.uint(msg[3])
    break

    case Messages.Type.GraphQL:
      return  this.string(msg[1]) && this.string(msg[2]) && this.string(msg[3]) && this.string(msg[4])
    break

    case Messages.Type.PerformanceTrack:
      return  this.int(msg[1]) && this.int(msg[2]) && this.uint(msg[3]) && this.uint(msg[4])
    break

    case Messages.Type.StringDict:
      return  this.uint(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.SetNodeAttributeDict:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3])
    break

    case Messages.Type.ResourceTimingDeprecated:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3]) && this.uint(msg[4]) && this.uint(msg[5]) && this.uint(msg[6]) && this.string(msg[7]) && this.string(msg[8])
    break

    case Messages.Type.ConnectionInformation:
      return  this.uint(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.SetPageVisibility:
      return  this.boolean(msg[1])
    break

    case Messages.Type.LoadFontFace:
      return  this.uint(msg[1]) && this.string(msg[2]) && this.string(msg[3]) && this.string(msg[4])
    break

    case Messages.Type.SetNodeFocus:
      return  this.int(msg[1])
    break

    case Messages.Type.LongTask:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3]) && this.uint(msg[4]) && this.string(msg[5]) && this.string(msg[6]) && this.string(msg[7])
    break

    case Messages.Type.SetNodeAttributeURLBased:
      return  this.uint(msg[1]) && this.string(msg[2]) && this.string(msg[3]) && this.string(msg[4])
    break

    case Messages.Type.SetCSSDataURLBased:
      return  this.uint(msg[1]) && this.string(msg[2]) && this.string(msg[3])
    break

    case Messages.Type.TechnicalInfo:
      return  this.string(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.CustomIssue:
      return  this.string(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.CSSInsertRuleURLBased:
      return  this.uint(msg[1]) && this.string(msg[2]) && this.uint(msg[3]) && this.string(msg[4])
    break

    case Messages.Type.MouseClick:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.string(msg[3]) && this.string(msg[4])
    break

    case Messages.Type.CreateIFrameDocument:
      return  this.uint(msg[1]) && this.uint(msg[2])
    break

    case Messages.Type.AdoptedSSReplaceURLBased:
      return  this.uint(msg[1]) && this.string(msg[2]) && this.string(msg[3])
    break

    case Messages.Type.AdoptedSSInsertRuleURLBased:
      return  this.uint(msg[1]) && this.string(msg[2]) && this.uint(msg[3]) && this.string(msg[4])
    break

    case Messages.Type.AdoptedSSDeleteRule:
      return  this.uint(msg[1]) && this.uint(msg[2])
    break

    case Messages.Type.AdoptedSSAddOwner:
      return  this.uint(msg[1]) && this.uint(msg[2])
    break

    case Messages.Type.AdoptedSSRemoveOwner:
      return  this.uint(msg[1]) && this.uint(msg[2])
    break

    case Messages.Type.JSException:
      return  this.string(msg[1]) && this.string(msg[2]) && this.string(msg[3]) && this.string(msg[4])
    break

    case Messages.Type.Zustand:
      return  this.string(msg[1]) && this.string(msg[2])
    break

    case Messages.Type.BatchMetadata:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3]) && this.int(msg[4]) && this.string(msg[5])
    break

    case Messages.Type.PartitionedMessage:
      return  this.uint(msg[1]) && this.uint(msg[2])
    break

    case Messages.Type.InputChange:
      return  this.uint(msg[1]) && this.string(msg[2]) && this.boolean(msg[3]) && this.string(msg[4]) && this.int(msg[5]) && this.int(msg[6])
    break

    case Messages.Type.SelectionChange:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.string(msg[3])
    break

    case Messages.Type.MouseThrashing:
      return  this.uint(msg[1])
    break

    case Messages.Type.UnbindNodes:
      return  this.uint(msg[1])
    break

    case Messages.Type.ResourceTiming:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3]) && this.uint(msg[4]) && this.uint(msg[5]) && this.uint(msg[6]) && this.string(msg[7]) && this.string(msg[8]) && this.uint(msg[9]) && this.boolean(msg[10])
    break

    }
  }

}
