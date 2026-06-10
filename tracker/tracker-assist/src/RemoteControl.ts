import Mouse from './Mouse.js'
import ConfirmWindow from './ConfirmWindow/ConfirmWindow.js'
import { controlConfirmDefault, } from './ConfirmWindow/defaults.js'
import type { Options as AssistOptions, } from './Assist.js'

export enum RCStatus {
  Disabled,
  Requesting,
  Enabled,
}


let setInputValue = function(this: HTMLInputElement | HTMLTextAreaElement,  value: string) { this.value = value }
const nativeInputValueDescriptor = typeof window !== 'undefined' && Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
if (nativeInputValueDescriptor && nativeInputValueDescriptor.set) {
  setInputValue = nativeInputValueDescriptor.set
}


export default class RemoteControl {
  private mouse: Mouse | null = null
  public status: RCStatus = RCStatus.Disabled
  private agentID: string | null = null

  constructor(
    private readonly options: AssistOptions,
    private readonly onGrand: (id: string) => string | undefined,
    private readonly onRelease: (id?: string | null, isDenied?: boolean) => void,
    private readonly onBusy: (id?: string) => void,
    private readonly updateState: (activeId?: string) => void,
  ) {}

  reconnect(ids: string[]) {
    const storedID = sessionStorage.getItem(this.options.session_control_peer_key)
    if (storedID !== null &&  ids.indexOf(storedID) !== -1) {
      this.grantControl(storedID)
    } else {
      sessionStorage.removeItem(this.options.session_control_peer_key)
    }
  }

  private confirm: ConfirmWindow | null = null
  requestControl = (id: string) => {
    if (this.status === RCStatus.Enabled) {
      return this.onBusy(id)
    }

    if (this.agentID !== null) {
      this.releaseControl()
      return
    }
    setTimeout(() => {
      if (this.status === RCStatus.Requesting) {
        this.releaseControl()
      }
    }, 30000)
    this.agentID = id
    this.status = RCStatus.Requesting
    this.confirm = new ConfirmWindow(controlConfirmDefault(this.options.controlConfirm))
    this.confirm.mount().then(allowed => {
      if (allowed) {
        this.grantControl(id)
      } else {
        this.confirm?.remove()
        this.releaseControl(true)
      }
    })
      .then(() => {
        this.confirm?.remove()
      })
      .catch(e => {
        this.confirm?.remove()
        console.error(e)
      })
  }

  releaseControl = (isDenied?: boolean, keepId?: boolean, skipUpdate?: boolean) => {
    if (this.confirm) {
      this.confirm.remove()
      this.confirm = null
    }
    this.resetMouse()
    this.status = RCStatus.Disabled
    if (!keepId) {
      sessionStorage.removeItem(this.options.session_control_peer_key)
    }
    this.onRelease(this.agentID, isDenied)
    this.agentID = null
    if (!skipUpdate) {
      this.updateState();
    }
  }

  grantControl = (id: string, skipUpdate?: boolean) => {
    this.agentID = id
    this.status = RCStatus.Enabled
    sessionStorage.setItem(this.options.session_control_peer_key, id)
    const agentName = this.onGrand(id)
    if (this.mouse) {
      this.resetMouse()
    }
    if (!skipUpdate) {
      this.updateState(id);
    }
    this.mouse = new Mouse(agentName, this.options.onDragCamera)
    this.mouse.mount()
  }

  resetMouse = () => {
    this.mouse?.remove()
    this.mouse = null
  }

  private isAuthorized(id: string): boolean {
    return (
      this.status === RCStatus.Enabled &&
      id === this.agentID &&
      this.mouse !== null
    )
  }

  scroll = (id, d) => {
    if (!this.isAuthorized(id)) return
    this.mouse!.scroll(d)
  }
  move = (id, xy) => {
    if (!this.isAuthorized(id)) return
    return this.mouse!.move(xy)
  }
  private focused: HTMLElement | SVGElement | null = null
  click = (id, xy) => {
    if (!this.isAuthorized(id)) return
    this.focused = this.mouse!.click(xy)
  }
  focus = (id, el: HTMLElement) => {
    if (!this.isAuthorized(id)) return
    this.focused = el
  }
  startDrag = (id, xy) => {
    if (!this.isAuthorized(id)) return
    this.mouse!.startDrag(xy)
  }
  drag = (id, xydxdy) => {
    if (!this.isAuthorized(id)) return
    this.mouse!.drag(xydxdy);
  }
  stopDrag = (id) => {
    if (!this.isAuthorized(id)) return
    this.mouse!.stopDrag();
  }
  input = (id, value: string) => {
    if (!this.isAuthorized(id) || !this.focused) return
    if (this.focused instanceof HTMLTextAreaElement
      || this.focused instanceof HTMLInputElement
      || this.focused.tagName === 'INPUT'
      || this.focused.tagName === 'TEXTAREA') {
      setInputValue.call(this.focused, value)
      const ev = new Event('input', { bubbles: true,})
      this.focused.dispatchEvent(ev)
      // @ts-ignore
    } else if (this.focused.isContentEditable) {
      // @ts-ignore
      this.focused.innerText = value
    }
  }
  // Native <select> can't be opened through the agent's mouse (the picker is
  // a browser-native popup), so the agent opens it on the mirrored DOM and we
  // receive the chosen value here to apply on the real element.
  select = (id: string, value: string) => {
    if (!this.isAuthorized(id) || !this.focused) return
    if (this.focused instanceof HTMLSelectElement) {
      this.focused.value = value
      this.focused.dispatchEvent(new Event('input', { bubbles: true }))
      this.focused.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }
}
