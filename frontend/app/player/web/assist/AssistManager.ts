import type { Socket } from 'socket.io-client';
import type Screen from '../Screen/Screen';
import type { Store } from '../../common/types'
import type { Message } from '../messages';
import MStreamReader from '../messages/MStreamReader';
import JSONRawMessageReader from '../messages/JSONRawMessageReader'
import Call, { CallingState } from './Call';
import RemoteControl, { RemoteControlStatus } from './RemoteControl'
import ScreenRecording,  { SessionRecordingStatus } from './ScreenRecording'


export {
  RemoteControlStatus,
  SessionRecordingStatus,
  CallingState,
}

export enum ConnectionStatus {
  Connecting,
  WaitingMessages,
  Connected,
  Inactive,
  Disconnected,
  Error,
  Closed,
}


export function getStatusText(status: ConnectionStatus): string {
  switch(status) {
    case ConnectionStatus.Closed:
      return 'Closed...';
    case ConnectionStatus.Connecting:
      return "Connecting...";
    case ConnectionStatus.Connected:
      return "";
    case ConnectionStatus.Inactive:
      return "Client tab is inactive";
    case ConnectionStatus.Disconnected:
      return "Disconnected";
    case ConnectionStatus.Error:
      return "Something went wrong. Try to reload the page.";
    case ConnectionStatus.WaitingMessages:
      return "Connected. Waiting for the data... (The tab might be inactive)"
  }
}

// export interface State {
//   peerConnectionStatus: ConnectionStatus;
//   assistStart: number;
// }

const MAX_RECONNECTION_COUNT = 4;

export default class AssistManager {
  static readonly INITIAL_STATE = {
    peerConnectionStatus: ConnectionStatus.Connecting,
    assistStart: 0,
    ...Call.INITIAL_STATE,
    ...RemoteControl.INITIAL_STATE,
    ...ScreenRecording.INITIAL_STATE,
  }
  // TODO: Session type
  constructor(
    private session: any,
    private setMessagesLoading: (flag: boolean) => void,
    private handleMessage: (m: Message, index: number) => void,
    private screen: Screen,
    private config: RTCIceServer[] | null,
    private store: Store<typeof AssistManager.INITIAL_STATE>,
    public readonly uiErrorHandler?: { error: (msg: string) => void }
  ) {}

  private get borderStyle() {
    const { recordingState, remoteControl } = this.store.get()

    const isRecordingActive = recordingState === SessionRecordingStatus.Recording
    const isControlActive = remoteControl === RemoteControlStatus.Enabled
    // recording gets priority here
    if (isRecordingActive) return { border: '2px dashed red' }
    if (isControlActive) return { border: '2px dashed blue' }
    return { border: 'unset'}
  }

  private setStatus(status: ConnectionStatus) {
    if (this.store.get().peerConnectionStatus === ConnectionStatus.Disconnected &&
      status !== ConnectionStatus.Connected) {
      return
    }

    if (status === ConnectionStatus.Connecting) {
      this.setMessagesLoading(true);
    } else {
      this.setMessagesLoading(false);
    }
    if (status === ConnectionStatus.Connected) {
      this.screen.display(true);
    } else {
      this.screen.display(false);
    }
    this.store.update({ peerConnectionStatus: status });
  }

  private get peerID(): string {
    return `${this.session.projectKey}-${this.session.sessionId}`
  }

  private socketCloseTimeout: ReturnType<typeof setTimeout> | undefined
  private onVisChange = () => {
    this.socketCloseTimeout && clearTimeout(this.socketCloseTimeout)
    if (document.hidden) {
      this.socketCloseTimeout = setTimeout(() => {
        const state = this.store.get()
        if (document.hidden &&
          // TODO: should it be RemoteControlStatus.Disabled? (check)
          (state.calling === CallingState.NoCall && state.remoteControl === RemoteControlStatus.Enabled)) {
          this.socket?.close()
        }
      }, 30000)
    } else {
      this.socket?.open()
    }
  }

  private socket: Socket | null = null
  private disconnectTimeout: ReturnType<typeof setTimeout> | undefined
  private inactiveTimeout: ReturnType<typeof setTimeout> | undefined
  private clearDisconnectTimeout() {
    this.disconnectTimeout && clearTimeout(this.disconnectTimeout)
    this.disconnectTimeout = undefined
  }
  private clearInactiveTimeout() {
    this.inactiveTimeout && clearTimeout(this.inactiveTimeout)
    this.inactiveTimeout = undefined
  }
  connect(agentToken: string) {
    const jmr = new JSONRawMessageReader()
    const reader = new MStreamReader(jmr, this.session.startedAt)
    let waitingForMessages = true

    const now = +new Date()
    this.store.update({ assistStart: now })

    // @ts-ignore
    import('socket.io-client').then(({ default: io }) => {
      if (this.socket != null || this.cleaned) { return }
      // @ts-ignore
      const urlObject = new URL(window.env.API_EDP || window.location.origin) // does it handle ssl automatically?

      const socket: Socket = this.socket = io(urlObject.origin, {
        multiplex: true,
        path: '/ws-assist/socket',
        auth: {
          token: agentToken
        },
        query: {
          peerId: this.peerID,
          identity: "agent",
          agentInfo: JSON.stringify({
            ...this.session.agentInfo,
            query: document.location.search
          })
        }
      })
      socket.on("connect", () => {
        waitingForMessages = true
        this.setStatus(ConnectionStatus.WaitingMessages) // TODO: reconnect happens frequently on bad network
      })

      let currentTab = ''
      socket.on('messages', messages => {
        jmr.append(messages) // as RawMessage[]
        console.log(messages)
        if (waitingForMessages) {
          waitingForMessages = false // TODO: more explicit
          this.setStatus(ConnectionStatus.Connected)
        }

        for (let msg = reader.readNext();msg !== null;msg = reader.readNext()) {
          console.log(msg)
          this.handleMessage(msg, msg._index)
        }
      })

      socket.on('SESSION_RECONNECTED', () => {
        this.clearDisconnectTimeout()
        this.clearInactiveTimeout()
        this.setStatus(ConnectionStatus.Connected)
      })

      socket.on('UPDATE_SESSION', ({ active }) => {
        this.clearDisconnectTimeout()
        !this.inactiveTimeout && this.setStatus(ConnectionStatus.Connected)
        if (typeof active === "boolean") {
          this.clearInactiveTimeout()
          if (active) {
            this.setStatus(ConnectionStatus.Connected)
          } else {
            this.inactiveTimeout = setTimeout(() => this.setStatus(ConnectionStatus.Inactive), 5000)
          }
        }
      })
      socket.on('SESSION_DISCONNECTED', e => {
        waitingForMessages = true
        this.clearDisconnectTimeout()
        this.disconnectTimeout = setTimeout(() => {
          this.setStatus(ConnectionStatus.Disconnected)
        }, 30000)
      })
      socket.on('error', e => {
        console.warn("Socket error: ", e )
        this.setStatus(ConnectionStatus.Error);
      })

      // Maybe  do lazy initialization for all?
      // TODO: socket proxy (depend on interfaces)
      this.callManager = new Call(
        this.store,
        socket,
        this.config,
        this.peerID,
      )
      this.remoteControl = new RemoteControl(
        this.store,
        socket,
        this.screen,
        this.session.agentInfo,
        () => this.screen.setBorderStyle(this.borderStyle)
      )
      this.screenRecording = new ScreenRecording(
        this.store,
        socket,
        this.session.agentInfo,
        () => this.screen.setBorderStyle(this.borderStyle),
        this.uiErrorHandler
      )

      document.addEventListener('visibilitychange', this.onVisChange)
    })
  }


  /* ==== ScreenRecording ==== */
  private screenRecording: ScreenRecording | null = null
  requestRecording = (...args: Parameters<ScreenRecording['requestRecording']>) => {
    return this.screenRecording?.requestRecording(...args)
  }
  stopRecording = (...args: Parameters<ScreenRecording['stopRecording']>) => {
    return this.screenRecording?.stopRecording(...args)
  }


  /* ==== RemoteControl ==== */
  private remoteControl: RemoteControl | null = null
  requestReleaseRemoteControl = (...args: Parameters<RemoteControl['requestReleaseRemoteControl']>) => {
    return this.remoteControl?.requestReleaseRemoteControl(...args)
  }
  setRemoteControlCallbacks = (...args: Parameters<RemoteControl['setCallbacks']>) => {
    return this.remoteControl?.setCallbacks(...args)
  }
  releaseRemoteControl = (...args: Parameters<RemoteControl['releaseRemoteControl']>) => {
    return this.remoteControl?.releaseRemoteControl(...args)
  }
  toggleAnnotation = (...args: Parameters<RemoteControl['toggleAnnotation']>) => {
    return this.remoteControl?.toggleAnnotation(...args)
  }

  /* ==== Call  ==== */
  private callManager: Call | null = null
  initiateCallEnd = async (...args: Parameters<Call['initiateCallEnd']>) => {
    return this.callManager?.initiateCallEnd(...args)
  }
  setCallArgs = (...args: Parameters<Call['setCallArgs']>) => {
    return this.callManager?.setCallArgs(...args)
  }
  call = (...args: Parameters<Call['call']>) => {
    return this.callManager?.call(...args)
  }
  toggleVideoLocalStream = (...args: Parameters<Call['toggleVideoLocalStream']>) => {
    return this.callManager?.toggleVideoLocalStream(...args)
  }
  addPeerCall = (...args: Parameters<Call['addPeerCall']>) => {
    return this.callManager?.addPeerCall(...args)
  }


  /* ==== Cleaning ==== */
  private cleaned = false
  clean() {
    this.cleaned = true // sometimes cleaned before modules loaded
    this.remoteControl?.clean()
    this.callManager?.clean()
    this.socket?.close()
    this.socket = null
    this.clearDisconnectTimeout()
    this.clearInactiveTimeout()
    this.socketCloseTimeout && clearTimeout(this.socketCloseTimeout)
    document.removeEventListener('visibilitychange', this.onVisChange)
  }
}
