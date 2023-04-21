import type { Store } from '../common/types'
import type { Message } from './messages'

import WebPlayer from './WebPlayer'
import AssistManager from './assist/AssistManager'

import MFileReader from './messages/MFileReader'
import { requestEFSDom } from './network/loadFiles'

import { toast } from 'react-toastify'; // **


export default class WebLivePlayer extends WebPlayer {
  static readonly INITIAL_STATE = {
    ...WebPlayer.INITIAL_STATE,
    ...AssistManager.INITIAL_STATE,
    liveTimeTravel: false,
    assistLoading: false,
    // get ready() { // TODO TODO TODO how to extend state here?
    //   return this.assistLoading && super.ready
    // }
  }

  assistManager: AssistManager // public so far
  private readonly incomingMessages: Message[] = []
  private historyFileIsLoading = false
  private lastMessageInFileTime = 0
  private lastMessageInFileIndex = 0

  constructor(wpStore: Store<typeof WebLivePlayer.INITIAL_STATE>, private session:any, config: RTCIceServer[]) {
    super(wpStore, session, true)

    this.assistManager = new AssistManager(
      session,
      assistLoading => wpStore.update({ assistLoading }),
      (msg, idx) => {
        this.incomingMessages.push(msg)
        if (!this.historyFileIsLoading) {
          // TODO: fix index-ing after historyFile-load
          this.messageManager.distributeMessage(msg, idx)
        }
      },
      this.screen,
      config,
      wpStore,
    )
    this.assistManager.connect(session.agentToken)
  }

  toggleTimetravel = async () => {
    // TODO: implement via jump() API rewritten instead
    if (this.wpStore.get().liveTimeTravel) {
      return
    }
    let result = false;
    this.historyFileIsLoading = true
    this.messageManager.resetMessageManagers()

    try {
      await this.messageLoader.requestFallbackDOM()
      this.wpStore.update({
        liveTimeTravel: true,
      })
      this.messageManager.onMessagesLoaded()
      result = true
    } catch(e) {
      toast.error('Error requesting a session file')
      console.error("EFS file download error:", e)
    }

    // Append previously received messages
    this.incomingMessages
      .filter(msg => msg.time >= this.lastMessageInFileTime)
      .forEach((msg, i) => this.messageManager.distributeMessage(msg, this.lastMessageInFileIndex + i))
    this.incomingMessages.length = 0

    this.historyFileIsLoading = false
    return result;
  }

  jumpToLive = () => {
    this.wpStore.update({
      livePlay: true,
    })
    this.jump(this.wpStore.get().lastMessageTime)
  }

  clean = () => {
    this.incomingMessages.length = 0
    this.assistManager.clean()
    super.clean()
  }
}