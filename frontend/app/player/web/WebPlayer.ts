import { Log, LogLevel } from './types'

import type { Store } from '../common/types'
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
    liveTimeTravel: false,
  }

  private readonly screen: Screen
  private readonly inspectorController: InspectorController
  protected readonly messageManager: MessageManager

  assistManager: AssistManager // public so far
  private targetMarker: TargetMarker

  constructor(private wpState: Store<typeof WebPlayer.INITIAL_STATE>, session, config: RTCIceServer[], live: boolean) {

    let initialLists = live ? {} : {
      event: session.events.toJSON(),
      stack: session.stackEvents.toJSON(),
      resource: session.resources.toJSON(),
      exceptions: session.errors.toJSON().map(({ time, errorId, name }: any) =>
        Log({
          level: LogLevel.ERROR,
          value: name,
          time,
          errorId,
        })
      ),
    }

    const screen = new Screen()
    const messageManager = new MessageManager(session, wpState, screen, initialLists)
    super(wpState, messageManager)
    this.screen = screen
    this.messageManager = messageManager

    this.targetMarker = new TargetMarker(this.screen, wpState)
    this.inspectorController = new InspectorController(screen)


    const endTime = !live && session.duration.valueOf()
    wpState.update({
      //@ts-ignore
      initialized: true,
      //@ts-ignore
      session,

      live,
      livePlay: live,
      endTime, // : 0,
    })

    // TODO: separate LiveWebPlayer
    this.assistManager = new AssistManager(session, this.messageManager, config, wpState)
    if (live) {
      this.assistManager.connect(session.agentToken)
    }
  }

  attach = (parent: HTMLElement) => {
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
  setActiveTarget = (args: Parameters<TargetMarker['setActiveTarget']>) => {
    this.targetMarker.setActiveTarget(...args)
  }

  markTargets = (args: Parameters<TargetMarker['markTargets']>) => {
    this.pause()
    this.targetMarker.markTargets(...args)
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

  // TODO: restore notes functionality
  // injectNotes(notes: Note[]) {
  //   update({ notes })
  // }
  // filterOutNote(noteId: number) {
  //   const { notes } = getState()
  //   update({ notes: notes.filter((note: Note) => note.noteId !== noteId) })
  // }

  toggleUserName = (name?: string) => {
    this.screen.cursor.showTag(name)
  }

  clean = () => {
    super.clean()
    this.assistManager.clean()
    window.removeEventListener('resize', this.scale)
  }
}
