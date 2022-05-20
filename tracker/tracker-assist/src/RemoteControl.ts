import Mouse from './Mouse.js';
import ConfirmWindow from './ConfirmWindow/ConfirmWindow.js';
import { controlConfirmDefault } from './ConfirmWindow/defaults.js';
import type { Options as AssistOptions } from './Assist';

enum RCStatus {
  Disabled,
  Requesting,
  Enabled,
}


let setInputValue = function(this: HTMLInputElement | HTMLTextAreaElement,  value: string) { this.value = value }
const nativeInputValueDescriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")
if (nativeInputValueDescriptor && nativeInputValueDescriptor.set) {
  setInputValue = nativeInputValueDescriptor.set
}


export default class RemoteControl {
  private mouse: Mouse | null
  private status: RCStatus = RCStatus.Disabled
  private agentID: string | null = null

  constructor(
    private options: AssistOptions,
    private onGrand: (sting?) => void, 
    private onRelease: (sting?) => void) {}

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
      this.releaseControl(id)
      return 
    }
    setTimeout(() =>{
      if (this.status === RCStatus.Requesting) {
        this.releaseControl(id)
      }
    }, 30000)
    this.agentID = id
    this.status = RCStatus.Requesting
    this.confirm = new ConfirmWindow(controlConfirmDefault(this.options.controlConfirm))
    this.confirm.mount().then(allowed => {
      if (allowed) {
        this.grantControl(id)
      } else {
        this.releaseControl(id)
      }
    }).catch()
  }
  grantControl = (id: string) => {
    this.agentID = id
    this.status = RCStatus.Enabled
    this.mouse = new Mouse()
    this.mouse.mount()
    sessionStorage.setItem(this.options.session_control_peer_key, id)
    this.onGrand(id)
  }

  releaseControl = (id: string) => {
    if (this.agentID !== id) { return }
    this.confirm?.remove()
    this.mouse?.remove()
    this.mouse = null
    this.status = RCStatus.Disabled
    this.agentID = null
    sessionStorage.removeItem(this.options.session_control_peer_key)
    this.onRelease(id)
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
      const ev = new Event('input', { bubbles: true})
      this.focused.dispatchEvent(ev)
    } else if (this.focused.isContentEditable) {
      this.focused.innerText = value
    }
  }
}