import { Log, LogLevel } from './types/log'

import type { Store } from 'App/player'
import Player from '../player/Player'

import MessageManager from './MessageManager'
import InspectorController from './addons/InspectorController'
import TargetMarker from './addons/TargetMarker'
import Screen, { ScaleMode } from './Screen/Screen'
import { Message } from "Player/web/messages";


// export type State = typeof WebPlayer.INITIAL_STATE

export default class WebPlayer extends Player {
  static readonly INITIAL_STATE = {
    ...Player.INITIAL_STATE,
    ...TargetMarker.INITIAL_STATE,
    ...MessageManager.INITIAL_STATE,

    inspectorMode: false,
  }

  private readonly inspectorController: InspectorController
  protected screen: Screen
  protected readonly messageManager: MessageManager

  private targetMarker: TargetMarker

  constructor(protected wpState: Store<typeof WebPlayer.INITIAL_STATE>, session: any, live: boolean, isClickMap = false) {
    let initialLists = live ? {} : {
      event: session.events || [],
      stack: session.stackEvents || [],
      exceptions: session.errors?.map(({ name, ...rest }: any) =>
        Log({
          level: LogLevel.ERROR,
          value: name,
          ...rest,
        })
      ) || [],
    }

    const screen = new Screen(session.isMobile, isClickMap ? ScaleMode.AdjustParentHeight : ScaleMode.Embed)
    const messageManager = new MessageManager(session, wpState, screen, initialLists)
    super(wpState, messageManager)
    this.screen = screen
    this.messageManager = messageManager
    if (!live) { // hack. TODO: split OfflinePlayer class
      void messageManager.loadMessages(isClickMap)
    }

    this.targetMarker = new TargetMarker(this.screen, wpState)
    this.inspectorController = new InspectorController(screen)


    const endTime = session.duration?.valueOf() || 0
    wpState.update({
      //@ts-ignore
      session,

      live,
      livePlay: live,
      endTime, // : 0,
    })

    // @ts-ignore
    window.playerJumpToTime = this.jump.bind(this)

  }

  attach = (parent: HTMLElement, isClickmap?: boolean) => {
    this.screen.attach(parent)
    if (!isClickmap) {
      window.addEventListener('resize', this.scale)
      this.scale()
    }
  }

  scale = () => {
    const { width, height } = this.wpState.get()
    if (!this.screen && !this.inspectorController) return;
    // sometimes happens in live assist sessions for some reason
    this.screen?.scale?.({ width, height })
    this.inspectorController?.scale?.({ width, height })

    this.targetMarker.updateMarkedTargets()
  }

  // delayed message decoding for state plugins
  decodeMessage = (msg: Message) => {
    return this.messageManager.decodeMessage(msg)
  }

  // Inspector & marker
  mark(e: Element) {
    this.inspectorController.marker?.mark(e)
  }

  toggleInspectorMode = (flag: boolean, clickCallback?: Parameters<InspectorController['enableInspector']>[0]) => {
    if (typeof flag !== 'boolean') {
      const { inspectorMode } = this.wpState.get()
      flag = !inspectorMode
    }

    if (flag) {
      this.pause()
      this.wpState.update({ inspectorMode: true })
      return this.inspectorController.enableInspector(clickCallback)
    } else {
      this.inspectorController.disableInspector()
      this.wpState.update({ inspectorMode: false })
    }
  }

  // Target Marker
  setActiveTarget = (...args: Parameters<TargetMarker['setActiveTarget']>) => {
    this.targetMarker.setActiveTarget(...args)
  }

  markTargets = (...args: Parameters<TargetMarker['markTargets']>) => {
    this.pause()
    this.targetMarker.markTargets(...args)
  }

  showClickmap = (...args: Parameters<TargetMarker['injectTargets']>) => {
    this.screen.overlay.remove() // hack. TODO: 1.split Screen functionalities (overlay, mounter) 2. separate ClickMapPlayer class that does not create overlay
    this.freeze().then(() => {
      this.targetMarker.injectTargets(...args)
    })
  }

  toggleUserName = (name?: string) => {
    this.screen.cursor.showTag(name)
  }

  clean = () => {
    super.clean()
    this.screen.clean()
    // @ts-ignore
    this.screen = undefined;
    window.removeEventListener('resize', this.scale)
  }
}
