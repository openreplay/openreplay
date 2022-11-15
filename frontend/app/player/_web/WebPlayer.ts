import type { Store } from '../player/types'
import Player, { State as PlayerState } from '../player/Player'

import MessageManager from './MessageManager'
import AssistManager from './assist/AssistManager'
import Screen from './Screen/Screen'
import { State as MMState, INITIAL_STATE as MM_INITIAL_STATE } from './MessageManager'



export default class WebPlayer extends Player {
  private readonly screen: Screen
  private readonly messageManager: MessageManager

  assistManager: AssistManager // public so far

  constructor(private wpState: Store<MMState & PlayerState>, session, config, live: boolean) {
    // TODO: separate screen from manager
    const screen = new MessageManager(session, wpState, config, live) 
    super(wpState, screen)
    this.screen = screen
    this.messageManager = screen

    // TODO: separate LiveWebPlayer
    this.assistManager = new AssistManager(session, this.messageManager, config, wpState)

  
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
  }
  mark(e: Element) {
    this.screen.marker.mark(e)
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
  setMarkedTargets(selections: { selector: string, count: number }[] | null) {
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
  //       this.window?.scrollTo(this.actualScroll.x, this.actualScroll.y)
  //       this.actualScroll = null
  //     }
  //     update({ markedTargets: null });
  //   }
  }

  markTargets(targets: { selector: string, count: number }[] | null) {
  //   this.animator.pause();
  //   this.setMarkedTargets(targets);
  }

  toggleInspectorMode(flag, clickCallback) {
  //   if (typeof flag !== 'boolean') {
  //     const { inspectorMode } = getState();
  //     flag = !inspectorMode;
  //   }

  //   if (flag) {
  //     this.pause()
  //     update({ inspectorMode: true });
  //     return super.enableInspector(clickCallback);
  //   } else {
  //     super.disableInspector();
  //     update({ inspectorMode: false });
  //   }
  }

  async toggleTimetravel() {
    if (!this.wpState.get().liveTimeTravel) {
      return await this.messageManager.reloadWithUnprocessedFile()
    }
  }

  toggleUserName(name?: string) {
    this.screen.cursor.toggleUserName(name)
  }
  clean() {
    super.clean()
    this.assistManager.clean()
    window.removeEventListener('resize', this.scale)
  }
}

