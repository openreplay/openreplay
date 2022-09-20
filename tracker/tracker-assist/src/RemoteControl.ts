import Mouse from './Mouse.js'
import ConfirmWindow from './ConfirmWindow/ConfirmWindow.js'
import { controlConfirmDefault, } from './ConfirmWindow/defaults.js'
import type { Options as AssistOptions, } from './Assist'

export enum RCStatus {
  Disabled,
  Requesting,
  Enabled,
}


let setInputValue = function(this: HTMLInputElement | HTMLTextAreaElement,  value: string) { this.value = value }
const nativeInputValueDescriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
if (nativeInputValueDescriptor && nativeInputValueDescriptor.set) {
  setInputValue = nativeInputValueDescriptor.set
}


export default class RemoteControl {
  private mouse: Mouse | null
  status: RCStatus = RCStatus.Disabled
  private agentID: string | null = null

  constructor(
    private readonly options: AssistOptions,
    private readonly onGrand: (id: string) => string | undefined,
    private readonly onRelease: (id?: string | null) => void) {}

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
    if (this.agentID !== null) {
      this.releaseControl()
      return
    }
    setTimeout(() =>{
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
        this.releaseControl()
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

  releaseControl = () => {
    if (this.confirm) {
      this.confirm.remove()
      this.confirm = null
    }
    this.resetMouse()
    this.status = RCStatus.Disabled
    sessionStorage.removeItem(this.options.session_control_peer_key)
    this.onRelease(this.agentID)
    this.agentID = null
  }

  grantControl = (id: string) => {
    this.agentID = id
    this.status = RCStatus.Enabled
    sessionStorage.setItem(this.options.session_control_peer_key, id)
    const agentName = this.onGrand(id)
    if (this.mouse) {
      this.resetMouse()
    }
    this.mouse = new Mouse(agentName)
    this.mouse.mount()
  }

  resetMouse = () => {
    this.mouse?.remove()
    this.mouse = null
  }

  scroll = (id, d) => { id === this.agentID && this.mouse?.scroll(d) }
  move = (id, xy) => { id === this.agentID && this.mouse?.move(xy) }
  private focused: HTMLElement | null = null
  click = (id, xy) => {
    if (id !== this.agentID || !this.mouse) { return }
    this.focused = this.mouse.click(xy)
  }
  focus = (id, el: HTMLElement) => {
    this.focused = el
  }
  input = (id, value: string) => {
    if (id !== this.agentID || !this.mouse || !this.focused) { return }
    if (this.focused instanceof HTMLTextAreaElement
      || this.focused instanceof HTMLInputElement) {
      setInputValue.call(this.focused, value)
      const ev = new Event('input', { bubbles: true,})
      this.focused.dispatchEvent(ev)
    } else if (this.focused.isContentEditable) {
      this.focused.innerText = value
    }
  }
}
