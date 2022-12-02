import { toast } from 'react-toastify'

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
	static readonly INITIAL_STATE: Readonly<State> = {
		recordingState: SessionRecordingStatus.Off,
	}
	constructor(
		private store: Store<State>,
		private socket: Socket,
		private agentInfo: Object,
		private onToggle: (active: boolean) => void,
	) {
		socket.on('recording_accepted', () => {
      this.toggleRecording(true)
    })
    socket.on('recording_rejected', () => {
      this.toggleRecording(false)
    })
    socket.on('recording_busy', () => {
      this.onRecordingBusy()
    })
	}

	private onRecordingBusy = () => {
    toast.error("This session is already being recorded by another agent")
  }

  requestRecording = () => {
    const recordingState = this.store.get().recordingState
    if (recordingState === SessionRecordingStatus.Requesting) return;

    this.store.update({ recordingState: SessionRecordingStatus.Requesting })
    this.socket.emit("request_recording", JSON.stringify({
      ...this.agentInfo,
      query: document.location.search,
    }))
  }

  stopRecording = () => {
    const recordingState = this.store.get().recordingState
    if (recordingState === SessionRecordingStatus.Off) return;

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