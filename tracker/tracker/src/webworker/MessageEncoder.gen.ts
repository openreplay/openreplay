// Auto-generated, do not edit
/* eslint-disable */

import * as Messages from '../common/messages.gen.js'
import Message from '../common/messages.gen.js'
import PrimitiveEncoder from './PrimitiveEncoder.js'


export default class MessageEncoder extends PrimitiveEncoder {
  encode(msg: Message): boolean {
    switch(msg[0]) {
    
    case Messages.Type.BatchMetadata:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3]) && this.int(msg[4]) && this.string(msg[5]) 
    break
    
    case Messages.Type.PartitionedMessage:
      return  this.uint(msg[1]) && this.uint(msg[2]) 
    break
    
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
    
    case Messages.Type.ConsoleLog:
      return  this.string(msg[1]) && this.string(msg[2]) 
    break
    
    case Messages.Type.PageLoadTiming:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3]) && this.uint(msg[4]) && this.uint(msg[5]) && this.uint(msg[6]) && this.uint(msg[7]) && this.uint(msg[8]) && this.uint(msg[9]) 
    break
    
    case Messages.Type.PageRenderTiming:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3]) 
    break
    
    case Messages.Type.JSException:
      return  this.string(msg[1]) && this.string(msg[2]) && this.string(msg[3]) 
    break
    
    case Messages.Type.RawCustomEvent:
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
    
    case Messages.Type.ResourceTiming:
      return  this.uint(msg[1]) && this.uint(msg[2]) && this.uint(msg[3]) && this.uint(msg[4]) && this.uint(msg[5]) && this.uint(msg[6]) && this.string(msg[7]) && this.string(msg[8]) 
    break
    
    case Messages.Type.ConnectionInformation:
      return  this.uint(msg[1]) && this.string(msg[2]) 
    break
    
    case Messages.Type.SetPageVisibility:
      return  this.boolean(msg[1]) 
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
    
    case Messages.Type.Zustand:
      return  this.string(msg[1]) && this.string(msg[2]) 
    break
    
    }
  }

}
