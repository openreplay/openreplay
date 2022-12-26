import type { Store } from '../common/types'

import WebPlayer from './WebPlayer'
import AssistManager from './assist/AssistManager'


export default class WebLivePlayer extends WebPlayer {
  static readonly INITIAL_STATE = {
    ...WebPlayer.INITIAL_STATE,
    ...AssistManager.INITIAL_STATE,
    liveTimeTravel: false,
  }

  assistManager: AssistManager // public so far
  constructor(wpState: Store<typeof WebLivePlayer.INITIAL_STATE>, session:any, config: RTCIceServer[]) {
    super(wpState, session, true)

    this.assistManager = new AssistManager(session, this.messageManager, this.screen, config, wpState)
    this.assistManager.connect(session.agentToken)
  }

  // TODO separate message receivers
  toggleTimetravel = async () => {
    if (!this.wpState.get().liveTimeTravel) {
      await this.messageManager.reloadWithUnprocessedFile(() =>
        this.wpState.update({
          liveTimeTravel: true,
        })
      )
    }
  }
}