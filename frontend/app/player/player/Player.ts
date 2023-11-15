import * as typedLocalStorage from './localStorage';

import type { Store } from '../common/types';
import Animator, { IMessageManager } from './Animator';
import type { GetState as AnimatorGetState } from './Animator';
export const SPEED_OPTIONS = [0.5, 1, 2, 4, 8, 16]
import type { Message } from "Player/web/messages";

/* == separate this == */
const HIGHEST_SPEED = 16
const SPEED_STORAGE_KEY = "__$player-speed$__"
const SKIP_STORAGE_KEY = "__$player-skip$__"
const SKIP_TO_ISSUE_STORAGE_KEY = "__$session-skipToIssue$__"
const AUTOPLAY_STORAGE_KEY = "__$player-autoplay$__"
const SHOW_EVENTS_STORAGE_KEY = "__$player-show-events$__"
const storedSpeed: number = typedLocalStorage.number(SPEED_STORAGE_KEY)
const initialSpeed = SPEED_OPTIONS.includes(storedSpeed) ? storedSpeed : 1
const initialSkip = typedLocalStorage.boolean(SKIP_STORAGE_KEY)
const initialSkipToIssue = typedLocalStorage.boolean(SKIP_TO_ISSUE_STORAGE_KEY)
const initialAutoplay = typedLocalStorage.boolean(AUTOPLAY_STORAGE_KEY)
const initialShowEvents = typedLocalStorage.boolean(SHOW_EVENTS_STORAGE_KEY)

export type State = typeof Player.INITIAL_STATE
/* == */

export default class Player extends Animator {
  static INITIAL_STATE = {
    ...Animator.INITIAL_STATE,
    skipToIssue: initialSkipToIssue,
    showEvents: initialShowEvents,

    autoplay: initialAutoplay,
    skip: initialSkip,
    speed: initialSpeed,
  } as const

  constructor(private pState: Store<State & AnimatorGetState>, private manager: IMessageManager) {
    super(pState, manager)

    // Autoplay
    if (pState.get().autoplay) {
      let autoPlay = true;
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          const { playing } = pState.get();
          autoPlay = playing
          if (playing) {
            this.pause();
          }
        } else if (autoPlay) {
          this.play();
        }
      })

      if (!document.hidden) {
        this.play();
      }
    }
  }

  /* === TODO: incapsulate in LSCache === */

  toggleAutoplay() {
    const autoplay = !this.pState.get().autoplay
    localStorage.setItem(AUTOPLAY_STORAGE_KEY, `${autoplay}`);
    this.pState.update({ autoplay })
  }

  //TODO: move to react part (with localStorage-cache react hook)?
  toggleEvents() {
    const showEvents = !this.pState.get().showEvents
    localStorage.setItem(SHOW_EVENTS_STORAGE_KEY, `${showEvents}`);
    this.pState.update({ showEvents })
  }

  // TODO: move to React part
  toggleSkipToIssue() {
    const skipToIssue = !this.pState.get().skipToIssue
    localStorage.setItem(SKIP_TO_ISSUE_STORAGE_KEY, `${skipToIssue}`);
    this.pState.update({ skipToIssue })
  }

  toggleSkip() {
    const skip = !this.pState.get().skip
    localStorage.setItem(SKIP_STORAGE_KEY, `${skip}`);
    this.pState.update({ skip })
  }  
  private updateSpeed(speed: number) {
    localStorage.setItem(SPEED_STORAGE_KEY, `${speed}`);
    this.pState.update({ speed })
  }

  toggleSpeed(index: number | null) {
    const { speed } = this.pState.get();
    const newSpeedIndex = index === null ? null : Math.max(0, Math.min(SPEED_OPTIONS.length - 1, index));
    this.updateSpeed(newSpeedIndex === null ? speed * 2 : SPEED_OPTIONS[newSpeedIndex]);
  }

  speedUp() {
    const { speed } = this.pState.get()
    this.updateSpeed(Math.min(HIGHEST_SPEED, speed * 2))
  }

  speedDown() {
    const { speed } = this.pState.get()
    this.updateSpeed(Math.max(1, speed / 2))
  }
  /* === === */


  clean() {
    this.pause()
    this.manager.clean()
  }

}
