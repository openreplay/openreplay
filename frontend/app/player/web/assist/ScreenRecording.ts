import type { Socket } from './types'
import type { Store } from '../../common/types'


export enum SessionRecordingStatus {
  Off,
  Requesting,
  Recording
}

export interface State {
	recordingState: SessionRecordingStatus;
}

export default class ScreenRecording {
  onDeny: () => void = () => {}
	static readonly INITIAL_STATE: Readonly<State> = {
		recordingState: SessionRecordingStatus.Off,
	}
	constructor(
		private store: Store<State>,
		private socket: Socket,
		private agentInfo: Object,
		private onToggle: (active: boolean) => void,
    public readonly uiErrorHandler: { error: (msg: string) => void } | undefined
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
	}

	private onRecordingBusy = () => {
    this.uiErrorHandler?.error("This session is already being recorded by another agent")
  }

  requestRecording = ({ onDeny }: { onDeny: () => void }) => {
    this.onDeny = onDeny
    const recordingState = this.store.get().recordingState
    if (recordingState === SessionRecordingStatus.Requesting) return;

    this.store.update({ recordingState: SessionRecordingStatus.Requesting })
    this.socket.emit("request_recording", JSON.stringify({
      ...this.agentInfo,
      query: document.location.search,
    }))
  }

  stopRecording = () => {
    this.socket.emit("stop_recording")
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