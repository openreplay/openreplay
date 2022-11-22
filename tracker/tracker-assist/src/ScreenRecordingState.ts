import ConfirmWindow from './ConfirmWindow/ConfirmWindow.js'
import { recordRequestDefault, } from './ConfirmWindow/defaults.js'
import type { Options as AssistOptions, } from './Assist'

export enum RecordingState {
  Off,
  Requested,
  Recording,
}

const borderStyles = {
    height: '100vh',
    width: '100vw',
  border: '2px dashed red',
  left: 0,
  top: 0,
  position: 'fixed',
  'pointer-events': 'none',
}

const buttonStyles = {
  cursor: 'pointer',
  color: 'white',
  position: 'fixed',
  bottom: '0',
  left: 'calc(50vw - 60px)',
  'font-weight': 500,
  padding: '2px 4px',
  background: '#394EFF',
  'border-top-right-radius': '3px',
  'border-top-left-radius': '3px',
  'text-align': 'center',
}

export default class ScreenRecordingState {
  private status = RecordingState.Off
  private agentsRecordingSession: string[] = []
  private overlayAdded = false

  constructor(
    private readonly onAccept: () => void,
    private readonly onDeny: () => void,
    private readonly options: AssistOptions
  ) {}

  public get isActive() {
    return this.status !== RecordingState.Off
  }

  private confirm: ConfirmWindow | null = null

  public requestRecording = (id: string) => {
    if (this.status !== RecordingState.Off) return
    this.status = RecordingState.Requested

    this.confirm = new ConfirmWindow(recordRequestDefault(this.options.controlConfirm))
    this.confirm.mount().then(allowed => {
      if (allowed) {
        this.acceptRecording()
        this.agentsRecordingSession.push(id)
      } else {
        this.confirm?.remove()
        this.rejectRecording()
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

  private readonly acceptRecording = () => {
    if (!this.overlayAdded) {
      const stopButton = window.document.createElement('div')
      stopButton.onclick = () => this.rejectRecording()
      Object.assign(stopButton.style, buttonStyles)
      stopButton.textContent = 'Stop Recording'
      stopButton.id = 'or-recording-button'
      stopButton.setAttribute('data-openreplay-obscured', '')
      stopButton.setAttribute('data-openreplay-hidden', '')
      stopButton.setAttribute('data-openreplay-ignore', '')
      window.document.body.appendChild(stopButton)

      const borderWindow = window.document.createElement('div')
      Object.assign(borderWindow.style, borderStyles)
      borderWindow.id = 'or-recording-border'
      borderWindow.setAttribute('data-openreplay-obscured', '')
      borderWindow.setAttribute('data-openreplay-hidden', '')
      borderWindow.setAttribute('data-openreplay-ignore', '')
      window.document.body.appendChild(borderWindow)

      this.overlayAdded = true
    }
    this.onAccept()
    this.status = RecordingState.Recording
  }

  public readonly rejectRecording = (id?: string) => {
    if (id) {
      const agentIndex = this.agentsRecordingSession.findIndex(agentId => agentId === id)
      if (agentIndex === -1) return
      else this.agentsRecordingSession = this.agentsRecordingSession.filter(agentId => agentId !== id)

      if (this.agentsRecordingSession.length > 0) return
    }

    this.onDeny()
    this.confirm?.remove()
    this.status = RecordingState.Off

    const borders = window.document.querySelector('#or-recording-border')
    const button = window.document.querySelector('#or-recording-button')
    if (borders && button) {
      borders.parentElement?.removeChild(borders)
      button.parentElement?.removeChild(button)
    }
  }
}
