import type { Store } from '../player/types'
import Player, { State as PlayerState } from '../player/Player'

import MessageManager from './MessageManager'
import InspectorController from './InspectorController'
import TargetMarker from './TargetMarker'
import AssistManager, { 
  INITIAL_STATE as ASSIST_INITIAL_STATE,
} from './assist/AssistManager'
import Screen from './Screen/Screen'

// export type State = typeof WebPlayer.INITIAL_STATE

export default class WebPlayer extends Player {
  static INITIAL_STATE = {
    ...Player.INITIAL_STATE,
    ...TargetMarker.INITIAL_STATE,

    ...MessageManager.INITIAL_STATE,
    ...ASSIST_INITIAL_STATE,

    inspectorMode: false,
  }

  private readonly screen: Screen
  private readonly inspectorController: InspectorController
  protected readonly messageManager: MessageManager

  assistManager: AssistManager // public so far
  private targetMarker: TargetMarker

  constructor(private wpState: Store<State>, session, config: RTCIceServer[], live: boolean) {
    // TODO: separate screen from manager
    const screen = new MessageManager(session, wpState, config, live) 
    super(wpState, screen)
    this.screen = screen
    this.messageManager = screen

    // TODO: separate LiveWebPlayer
    this.assistManager = new AssistManager(session, this.messageManager, config, wpState)

    this.targetMarker = new TargetMarker(this.screen)

    this.inspectorController = new InspectorController(screen)

  
    const endTime = !live && session.duration.valueOf()
    wpState.update({
      //@ts-ignore
      initialized: true,
      //@ts-ignore
      session,
      
      live,
      livePlay: live,
      endTime, // : 0, //TODO: through initialState
    })

    if (live) {
      this.assistManager.connect(session.agentToken)
    }
  }

  attach(parent: HTMLElement) {
    this.screen.attach(parent)
    window.addEventListener('resize', this.scale)
    this.scale()
  }
  scale = () => {
    const { width, height } = this.wpState.get()
    this.screen.scale({ width, height })
    this.inspectorController.scale({ width, height })

    // this.updateMarketTargets() ??
  }

  // Inspector & marker
  mark(e: Element) {
    this.inspectorController.marker?.mark(e)
  }
  toggleInspectorMode(flag: boolean, clickCallback) {
    if (typeof flag !== 'boolean') {
      const { inspectorMode } = this.wpState.get()
      flag = !inspectorMode;
    }

    if (flag) {
      this.pause()
      this.wpState.update({ inspectorMode: true })
      return this.inspectorController.enableInspector(clickCallback);
    } else {
      this.inspectorController.disableInspector();
      this.wpState.update({ inspectorMode: false });
    }
  }

  setActiveTarget(args: Parameters<TargetMarker['setActiveTarget']>) {
    this.targetMarker.setActiveTarget(...args)
  }
  markTargets(args: Parameters<TargetMarker['markTargets']>) {
    this.pause()
    this.targetMarker.markTargets(...args)
  }


  // TODO
  async toggleTimetravel() {
    if (!this.wpState.get().liveTimeTravel) {
      return await this.messageManager.reloadWithUnprocessedFile()
    }
  }

  toggleUserName(name?: string) {
    this.screen.cursor.showTag(name)
  }
  
  clean() {
    super.clean()
    this.assistManager.clean()
    window.removeEventListener('resize', this.scale)
  }
}

