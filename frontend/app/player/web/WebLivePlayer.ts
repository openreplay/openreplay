import type { Store } from '../common/types'

import WebPlayer from './WebPlayer'
import AssistManager from './assist/AssistManager'


export default class WebLivePlayer extends WebPlayer {
  assistManager: AssistManager // public so far
  constructor(wpState: Store<typeof WebPlayer.INITIAL_STATE>, session:any, config: RTCIceServer[]) {
    super(wpState, session, true)

    this.assistManager = new AssistManager(session, this.messageManager, this.screen, config, wpState)
    this.assistManager.connect(session.agentToken)
  }
}