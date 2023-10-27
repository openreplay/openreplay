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
    scale: 1,
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
  }

  public updateDimensions(dimensions: { width: number; height: number }) {
    return this.messageManager.updateDimensions(dimensions)
  }

  public updateLists(session: any) {
    const exceptions = session.crashes.concat(session.errors || [])
    const lists = {
      event: session.events.map((e: Record<string, any>) => {
        if (e.name === 'Click') e.name = 'Touch'
        return e
      }) || [],
      frustrations: session.frustrations || [],
      stack: session.stackEvents || [],
      exceptions: exceptions.map(({ name, ...rest }: any) =>
        Log({
          level: LogLevel.ERROR,
          value: name,
          name,
          message: rest.reason,
          errorId: rest.crashId || rest.errorId,
          ...rest,
        })
      ) || [],
    }

    return this.messageManager.updateLists(lists)
  }

  public updateOverlayStyle(style: Partial<CSSStyleDeclaration>) {
    this.screen.updateOverlayStyle(style)
  }

  injectPlayer = (player: HTMLElement) => {
    this.screen.addToBody(player)
    this.screen.addMobileStyles()
    window.addEventListener('resize', () =>
      this.customScale(this.customConstrains.width, this.customConstrains.height)
    )
  }

  scale = () => {
    // const { width, height } = this.wpState.get()
    if (!this.screen) return;
    console.debug("using customConstrains to scale player")
    // sometimes happens in live assist sessions for some reason
    this.screen?.scale?.(this.customConstrains)
  }

  customConstrains = {
    width: 0,
    height: 0,
  }
  customScale = (width: number, height: number) => {
    if (!this.screen) return;
    this.screen?.scale?.({ width, height })
    this.customConstrains = { width, height }
    this.wpState.update({ scale: this.screen.getScale() })
  }

  addFullscreenBoundary = (isFullscreen?: boolean) => {
    if (isFullscreen) {
      this.screen?.addFullscreenBoundary()
    } else {
      this.screen?.addMobileStyles()
    }
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
