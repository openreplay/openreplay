import type { Socket } from './types'
import type { Store } from '../../common/types'


export enum SessionRecordingStatus {
  Off,
  Requesting,
  Recording
}

export interface State {
	recordingState: SessionRecordingStatus;
  currentTab?: string;
}

export default class ScreenRecording {
  private assistVersion = 1
  onDeny: () => void = () => {}
	static readonly INITIAL_STATE: Readonly<State> = {
		recordingState: SessionRecordingStatus.Off,
	}
	constructor(
		private store: Store<State>,
		private socket: Socket,
		private agentInfo: Object,
		private onToggle: (active: boolean) => void,
    public readonly uiErrorHandler: { error: (msg: string) => void } | undefined,
    private getAssistVersion: () => number
	) {
		socket.on('recording_accepted', () => {
      this.toggleRecording(true)
    })
    socket.on('recording_rejected', () => {
      this.toggleRecording(false)
      this.onDeny()
    })
    socket.on('recording_busy', () => {
      this.onRecordingBusy()
    })

    this.assistVersion = getAssistVersion()
	}

	private onRecordingBusy = () => {
    this.uiErrorHandler?.error("This session is already being recorded by another agent")
  }

  requestRecording = ({ onDeny }: { onDeny: () => void }) => {
    this.onDeny = onDeny
    const recordingState = this.store.get().recordingState
    if (recordingState === SessionRecordingStatus.Requesting) return;

    this.store.update({ recordingState: SessionRecordingStatus.Requesting })
    this.emitData("request_recording", JSON.stringify({
        ...this.agentInfo,
        query: document.location.search,
      })
    )
  }

  private emitData = (event: string, data?: any) => {
    if (this.getAssistVersion() === 1) {
      this.socket.emit(event, data)
    } else {
      this.socket.emit(event, { meta: { tabId: this.store.get().currentTab }, data })
    }
  }

  stopRecording = () => {
    this.emitData("stop_recording")
    this.toggleRecording(false)
  }

  private toggleRecording = (isAccepted: boolean) => {
    this.store.update({ 
    	recordingState: isAccepted 
    		? SessionRecordingStatus.Recording 
    		: SessionRecordingStatus.Off,
    })

    this.onToggle(isAccepted)
  }
}