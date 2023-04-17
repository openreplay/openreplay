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
  }

  assistManager: AssistManager // public so far
  private readonly incomingMessages: Message[] = []
  private historyFileIsLoading = false
  private lastMessageInFileTime = 0
  private lastMessageInFileIndex = 0

  constructor(wpState: Store<typeof WebLivePlayer.INITIAL_STATE>, private session:any, config: RTCIceServer[] | null) {
    super(wpState, session, true)

    this.assistManager = new AssistManager(
      session,
      f => this.messageManager.setMessagesLoading(f),
      (msg, idx) => {
        this.incomingMessages.push(msg)
        if (!this.historyFileIsLoading) {
          // TODO: fix index-ing after historyFile-load
          this.messageManager.distributeMessage(msg, idx)
        }
      },
      this.screen,
      config,
      wpState,
    )
    this.assistManager.connect(session.agentToken)
  }

  toggleTimetravel = async () => {
    if (this.wpState.get().liveTimeTravel) {
      return
    }
    let result = false;
    this.historyFileIsLoading = true
    this.messageManager.setMessagesLoading(true) // do it in one place. update unique  loading states each time instead
    this.messageManager.resetMessageManagers()

    try {
      const bytes = await requestEFSDom(this.session.sessionId)
      const fileReader = new MFileReader(bytes, this.session.startedAt)
      for (let msg = fileReader.readNext();msg !== null;msg = fileReader.readNext()) {
        this.messageManager.distributeMessage(msg)
      }
      this.wpState.update({
        liveTimeTravel: true,
      })
      result = true
      // here we need to update also lists state, if we gonna use them this.messageManager.onFileReadSuccess
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
    this.messageManager.setMessagesLoading(false)
    return result;
  }

  jumpToLive = () => {
    this.wpState.update({
      live: true,
      livePlay: true,
    })
    this.jump(this.wpState.get().lastMessageTime)
  }

  clean = () => {
    this.incomingMessages.length = 0
    this.assistManager.clean()
    this.screen?.clean?.()
    // @ts-ignore
    this.screen = undefined;
    super.clean()
  }
}