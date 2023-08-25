import { Log, LogLevel, SessionFilesInfo } from 'Player'

import type { Store } from 'Player'
import MessageLoader from "Player/web/MessageLoader";
import Player from '../player/Player'
import Screen, { ScaleMode } from '../web/Screen/Screen'
import IOSMessageManager from "Player/mobile/IOSMessageManager";

export default class IOSPlayer extends Player {
  static readonly INITIAL_STATE = {
    ...Player.INITIAL_STATE,
    ...MessageLoader.INITIAL_STATE,
    ...IOSMessageManager.INITIAL_STATE,
  }
  public screen: Screen
  protected messageManager: IOSMessageManager
  protected readonly messageLoader: MessageLoader
  constructor(
    protected wpState: Store<any>,
    session: SessionFilesInfo,
    public readonly uiErrorHandler?: { error: (msg: string) => void }
  ) {
    const screen = new Screen(true, ScaleMode.Embed)
    const messageManager = new IOSMessageManager(session, wpState, screen, uiErrorHandler)
    const messageLoader = new MessageLoader(
      session,
      wpState,
      messageManager,
      false,
      uiErrorHandler
    )
    super(wpState, messageManager);
    this.screen = screen
    this.messageManager = messageManager
    this.messageLoader = messageLoader

    void messageLoader.loadFiles()
    const endTime = session.duration?.valueOf() || 0

    wpState.update({
      session,
      endTime,
    })
  }

  attach = (parent: HTMLElement) => {
    this.screen.attach(parent)
    window.addEventListener('resize', this.scale)
    this.scale()
  }

  scale = () => {
    const { width, height } = this.wpState.get()
    if (!this.screen) return;
    // sometimes happens in live assist sessions for some reason
    this.screen?.scale?.({ width: 320, height: 720 })
  }


  clean = () => {
    super.clean()
    this.screen.clean()
    // @ts-ignore
    this.screen = undefined;
    this.messageLoader.clean()
    // @ts-ignore
    this.messageManager = undefined;
    window.removeEventListener('resize', this.scale)
  }


}
