import ConfirmWindow from './ConfirmWindow/ConfirmWindow.js'
import { recordRequestDefault, } from './ConfirmWindow/defaults.js'
import type { Options as ConfirmOptions, } from './ConfirmWindow/defaults.js'

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
  pointerEvents: 'none',
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
  private recordingAgent: string
  private overlayAdded = false
  private uiComponents: [HTMLDivElement]

  constructor(private readonly confirmOptions: ConfirmOptions) { }

  public get isActive() {
    return this.status !== RecordingState.Off
  }

  private confirm: ConfirmWindow | null = null

  public requestRecording = (
    id: string,
    onAccept: () => void,
    onDeny: () => void,
  ) => {
    if (this.isActive) return
    this.status = RecordingState.Requested

    this.confirm = new ConfirmWindow(recordRequestDefault(this.confirmOptions))
    this.confirm
      .mount()
      .then((allowed) => {
        if (allowed) {
          this.acceptRecording()
          onAccept()

          this.recordingAgent = id
        } else {
          this.rejectRecording()
          onDeny()
        }
      })
      .then(() => {
        this.confirm?.remove()
      })
      .catch((e) => {
        this.confirm?.remove()
        console.error(e)
      })
  }

  private readonly acceptRecording = () => {
    if (!this.overlayAdded) {
      const borderWindow = window.document.createElement('div')
      Object.assign(borderWindow.style, borderStyles)
      borderWindow.className = 'or-recording-border'
      borderWindow.setAttribute('data-openreplay-obscured', '')
      borderWindow.setAttribute('data-openreplay-hidden', '')
      borderWindow.setAttribute('data-openreplay-ignore', '')
      window.document.body.appendChild(borderWindow)

      this.overlayAdded = true

      this.uiComponents = [borderWindow,]
    }
    this.status = RecordingState.Recording
  }

  public readonly stopAgentRecording = (id) => {
    if (id === this.recordingAgent) {
      this.rejectRecording()
    }
  }

  public readonly stopRecording = () => {
    this.rejectRecording()
  }

  private readonly rejectRecording = () => {
    this.confirm?.remove()
    this.status = RecordingState.Off

    this.overlayAdded = false
    this.uiComponents?.forEach((el) => el.parentElement?.removeChild(el))
  }
}
