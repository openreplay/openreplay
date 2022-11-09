import ConfirmWindow from './ConfirmWindow/ConfirmWindow.js'
import { recordRequestDefault, } from './ConfirmWindow/defaults.js'
import type { Options as AssistOptions, } from './Assist'

export enum RecordingState {
  Off,
  Requested,
  Recording,
}

const defaultStyles = '2px dashed red'
const leftTop = { left: 0, top: 0, position: 'fixed', }
const bottomRight = { right: 0, bottom: 0, position: 'fixed', }

const borderEmulationStyles = {
  left: {
    ...leftTop,
    height: '100vh',
    width: 0,
    borderLeft: defaultStyles,
  },
  top: {
    ...leftTop,
    height: 0,
    width: '100vw',
    borderTop: defaultStyles,
  },
  right: {
    ...bottomRight,
    height: '100vh',
    width: 0,
    borderRight: defaultStyles,
  },
  bottom: {
    ...bottomRight,
    height: 0,
    width: '100vw',
    borderBottom: defaultStyles,
  },
}

export default class ScreenRecordingState {
  public status = RecordingState.Off

  constructor(
    private readonly onAccept: () => void,
    private readonly onDeny: () => void,
    private readonly options: AssistOptions
  ) {}

  private confirm: ConfirmWindow | null = null

  public requestRecording = () => {
    if (this.status !== RecordingState.Off) return
    this.status = RecordingState.Requested

      // todo: change timeout to deny after testing
      setTimeout(() => {
        console.log('starting recording')
        this.acceptRecording()
      }, 5000)

    this.confirm = new ConfirmWindow(recordRequestDefault(this.options.controlConfirm))
    this.confirm.mount().then(allowed => {
      if (allowed) {
        this.acceptRecording()
      } else {
        this.confirm?.remove()
        this.denyRecording()
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
    const borders = {
      left: window.document.createElement('div'),
      top: window.document.createElement('div'),
      right: window.document.createElement('div'),
      bottom: window.document.createElement('div'),
    }

    const stopButton = window.document.createElement('div')
    stopButton.onclick = this.denyRecording
    const styles = {
      cursor: 'pointer',
      color: 'white',
      position: 'fixed',
      bottom: 0,
      left: 'calc(50vw - 10px)',
      padding: 4,
      background: 'blue',
      borderRadius: 6,
      textAlign: 'center',
    }
    Object.assign(stopButton.style, styles)
    stopButton.textContent = 'Stop Recording'
    stopButton.id = 'or-recording-border'
    window.document.body.appendChild(stopButton)

    Object.entries(borderEmulationStyles).forEach(([key, style,]) => {
      Object.assign(borders[key].style, style)
      borders[key].id = 'or-recording-border'
      window.document.body.appendChild(borders[key])
    })

    this.onAccept()
    this.status = RecordingState.Recording
  }

  private readonly denyRecording = () => {
    this.onDeny()
    this.status = RecordingState.Off

    const borders = window.document.querySelectorAll('#or-recording-border')
    if (borders.length > 0) {
      borders.forEach(border => border.parentElement?.removeChild(border))
    }
  }
}
