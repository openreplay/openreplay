import type { Store } from '../player/types'
import Player, { State as PlayerState } from '../player/Player'

import MessageManager from './MessageManager'
import InspectorController from './InspectorController'
import AssistManager from './assist/AssistManager'
import Screen from './Screen/Screen'
import type { State as MMState } from './MessageManager'

export default class WebPlayer extends Player {
  private readonly screen: Screen
  private readonly inspectorController: InspectorController
  protected readonly messageManager: MessageManager

  assistManager: AssistManager // public so far

  constructor(private wpState: Store<MMState & PlayerState>, session, config: RTCIceServer[], live: boolean) {
    // TODO: separate screen from manager
    const screen = new MessageManager(session, wpState, config, live) 
    super(wpState, screen)
    this.screen = screen
    this.messageManager = screen

    // TODO: separate LiveWebPlayer
    this.assistManager = new AssistManager(session, this.messageManager, config, wpState)

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

  updateMarketTargets() {
  //   const { markedTargets } = getState();
  //   if (markedTargets) {
  //     update({
  //       markedTargets: markedTargets.map((mt: any) => ({ 
  //         ...mt, 
  //         boundingRect: this.calculateRelativeBoundingRect(mt.el),
  //       })),
  //     });
  //   }
  }

  // private calculateRelativeBoundingRect(el: Element): BoundingRect {
  //   if (!this.parentElement) return {top:0, left:0, width:0,height:0} //TODO
  //   const { top, left, width, height } = el.getBoundingClientRect();
  //   const s = this.getScale();
  //   const scrinRect = this.screen.getBoundingClientRect();
  //   const parentRect = this.parentElement.getBoundingClientRect();

  //   return {
  //     top: top*s + scrinRect.top - parentRect.top,
  //     left: left*s + scrinRect.left - parentRect.left,
  //     width: width*s,
  //     height: height*s,
  //   }
  // }

  setActiveTarget(index: number) {
  //   const window = this.window
  //   const markedTargets: MarkedTarget[] | null = getState().markedTargets
  //   const target = markedTargets && markedTargets[index]
  //   if (target && window) {
  //     const { fixedTop, rect } = getOffset(target.el, window)
  //     const scrollToY = fixedTop - window.innerHeight / 1.5
  //     if (rect.top < 0 || rect.top > window.innerHeight) {
  //       // behavior hack TODO: fix it somehow when they will decide to remove it from browser api
  //       // @ts-ignore
  //       window.scrollTo({ top: scrollToY, behavior: 'instant' })
  //       setTimeout(() => {
  //         if (!markedTargets) { return }
  //         update({
  //           markedTargets: markedTargets.map(t => t === target ? {
  //               ...target,
  //               boundingRect:  this.calculateRelativeBoundingRect(target.el),
  //             } : t)
  //         })
  //       }, 0)
  //     }
     
  //   }
  //   update({ activeTargetIndex: index });
  }

  // private actualScroll: Point | null = null
  private setMarkedTargets(selections: { selector: string, count: number }[] | null) {
  //   if (selections) {
  //     const totalCount = selections.reduce((a, b) => {
  //       return a + b.count
  //     }, 0);
  //     const markedTargets: MarkedTarget[] = [];
  //     let index = 0;
  //     selections.forEach((s) => {
  //       const el = this.getElementBySelector(s.selector);
  //       if (!el) return;
  //       markedTargets.push({
  //         ...s,
  //         el,
  //         index: index++,
  //         percent: Math.round((s.count * 100) / totalCount),
  //         boundingRect:  this.calculateRelativeBoundingRect(el),
  //         count: s.count,
  //       })
  //     });
  //     this.actualScroll = this.getCurrentScroll() 
  //     update({ markedTargets });
  //   } else {
  //     if (this.actualScroll) {
  //       this.screen.window?.scrollTo(this.actualScroll.x, this.actualScroll.y)
  //       this.actualScroll = null
  //     }
  //     update({ markedTargets: null });
  //   }
  }

  markTargets(targets: { selector: string, count: number }[] | null) {
    // this.pause();
    // this.setMarkedTargets(targets);
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

