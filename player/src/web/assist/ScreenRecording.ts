import type { Socket } from './types';
import type { Store } from '../../common/types';
import { createEmitter, listen, safeQuery } from './utils';

export enum SessionRecordingStatus {
  Off,
  Requesting,
  Recording,
}

export interface State {
  recordingState: SessionRecordingStatus;
  currentTab?: string;
}

const BUSY_REPLY_WINDOW = 5000;

export default class ScreenRecording {
  onDeny: () => void = () => {};

  private readonly unsubscribe: () => void;

  private readonly emitData: (event: string, data?: any) => void;

  private requestSentAt = 0;

  static readonly INITIAL_STATE: Readonly<State> = {
    recordingState: SessionRecordingStatus.Off,
  };

  constructor(
    private store: Store<State>,
    private socket: Socket,
    private agentInfo: object,
    private onToggle: (active: boolean) => void,
    public readonly uiErrorHandler:
      | { error: (msg: string) => void }
      | undefined,
    private getAssistVersion: () => number,
  ) {
    this.emitData = createEmitter(
      socket,
      getAssistVersion,
      () => this.store.get().currentTab,
    );
    // the tracker broadcasts these to every agent in the room without naming
    // the recipient, so only the agent in the matching state reacts
    this.unsubscribe = listen(socket, {
      recording_accepted: () => {
        if (this.state === SessionRecordingStatus.Requesting) {
          this.toggleRecording(true);
        }
      },
      recording_rejected: () => {
        if (this.state === SessionRecordingStatus.Requesting) {
          this.toggleRecording(false);
          this.onDeny();
        }
      },
      recording_busy: () => {
        // busy answers a request immediately; an older pending request of ours
        // is still waiting for the user and must not be reset by someone else's
        if (
          this.state === SessionRecordingStatus.Requesting &&
          Date.now() - this.requestSentAt < BUSY_REPLY_WINDOW
        ) {
          this.store.update({ recordingState: SessionRecordingStatus.Off });
          this.onRecordingBusy();
        }
      },
      SESSION_DISCONNECTED: () => this.resetPendingRequest(),
      disconnect: () => this.resetPendingRequest(),
    });
  }

  private get state() {
    return this.store.get().recordingState;
  }

  private resetPendingRequest() {
    if (this.state === SessionRecordingStatus.Requesting) {
      this.store.update({ recordingState: SessionRecordingStatus.Off });
    }
  }

  private onRecordingBusy = () => {
    this.uiErrorHandler?.error(
      'This session is already being recorded by another agent',
    );
  };

  requestRecording = ({ onDeny }: { onDeny: () => void }) => {
    this.onDeny = onDeny;
    const { recordingState } = this.store.get();
    if (recordingState === SessionRecordingStatus.Requesting) return;

    this.store.update({ recordingState: SessionRecordingStatus.Requesting });
    this.requestSentAt = Date.now();
    this.emitData(
      'request_recording',
      JSON.stringify({
        ...this.agentInfo,
        query: safeQuery(),
      }),
    );
  };

  stopRecording = () => {
    this.emitData('stop_recording');
    this.toggleRecording(false);
  };

  private toggleRecording = (isAccepted: boolean) => {
    this.store.update({
      recordingState: isAccepted
        ? SessionRecordingStatus.Recording
        : SessionRecordingStatus.Off,
    });

    this.onToggle(isAccepted);
  };

  clean() {
    this.unsubscribe();
  }
}
