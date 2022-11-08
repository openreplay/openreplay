export enum RecordingState {
  Off,
  Requested,
  Recording,
}

const defaultStyles = '2px dashed red; position: fixed;'
const leftTop = 'left: 0; top: 0'
const bottomRight = 'right: 0; bottom: 0'

const borderEmulationStyles = {
  left: `${leftTop}; height: 100vh; width: 0; border-left: ${defaultStyles}`,
  top: `${leftTop}; height: 0; width: 100vw; border-top: ${defaultStyles}`,
  right: `${bottomRight}; height: 100vh; width: 0; border-right: ${defaultStyles}`,
  bottom: `${bottomRight}; height: 0; width: 100vw; border-bottom: ${defaultStyles}`,
}

export default class ScreenRecordingState {
  public status = RecordingState.Off

  constructor(
    private readonly onAccept: () => void,
    private readonly onDeny: () => void,
  ) {}

  public requestRecording = () => {
    // mount recording window
    if (this.status !== RecordingState.Off) return
    this.status = RecordingState.Requested

    // todo: change timeout to deny after testing
    setTimeout(() => {
      console.log('starting recording')
      this.acceptRecording()
    }, 5000)
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
    const buttonStyle = 'position: fixed; bottom: 0; left: calc(50vw - 10px); padding: 4px; background: blue; border-radius: 6px; text-align: center;'
    buttonStyle.split(';').forEach(styleEntry => {
      console.log(styleEntry)
      const styleKeyVal = styleEntry.split(':')
      stopButton.style[styleKeyVal[0]] = styleKeyVal[1]
    })
    stopButton.textContent = 'Stop Recording'
    stopButton.id = 'or-recording-border'

    Object.entries(borderEmulationStyles).forEach(([key, style,]) => {
      const styleEntries = style.split(';')
      styleEntries.forEach(styleEntry => {
        console.log(styleEntry)
        const styleKeyVal = styleEntry.split(':')
        borders[key].style[styleKeyVal[0]] = styleKeyVal[1]
      })
      borders[key].style = style
      borders[key].id = 'or-recording-border'

      window.document.appendChild(borders[key])
    })
    window.document.appendChild(stopButton)

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
