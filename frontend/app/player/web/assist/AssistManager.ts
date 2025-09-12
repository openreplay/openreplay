import type { Socket } from 'socket.io-client';
import type Screen from '../Screen/Screen';
import type { Store } from '../../common/types'
import type { Message } from '../messages';
import MStreamReader from '../messages/MStreamReader';
import JSONRawMessageReader from '../messages/JSONRawMessageReader'
import ScreenRecording,  { SessionRecordingStatus } from './ScreenRecording'


export {
  SessionRecordingStatus,
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
  assistVersion = 1
  static readonly INITIAL_STATE = {
    peerConnectionStatus: ConnectionStatus.Connecting,
    assistStart: 0,
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

  public getAssistVersion = () => this.assistVersion

  private get borderStyle() {
    const { recordingState } = this.store.get()

    const isRecordingActive = recordingState === SessionRecordingStatus.Recording
    // recording gets priority here
    if (isRecordingActive) return { border: '2px dashed red' }
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
        if (document.hidden) {
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
  private inactiveTabs: string[] = []
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
        }
      })
      socket.on("connect", () => {
        waitingForMessages = true
        this.setStatus(ConnectionStatus.WaitingMessages) // TODO: reconnect happens frequently on bad network
      })

      socket.on('messages', messages => {
        const isOldVersion = messages.meta.version === 1
        this.assistVersion = isOldVersion ? 1 : 2

        const data = messages.data || messages
        jmr.append(data) // as RawMessage[]
        if (waitingForMessages) {
          waitingForMessages = false // TODO: more explicit
          this.setStatus(ConnectionStatus.Connected)
        }
        if (messages.meta.tabId !== this.store.get().currentTab) {
          this.clearDisconnectTimeout()
          if (isOldVersion) {
            reader.currentTab = messages.meta.tabId
            this.store.update({ currentTab: messages.meta.tabId })
          }
        }

        for (let msg = reader.readNext();msg !== null;msg = reader.readNext()) {
          this.handleMessage(msg, msg._index)
        }
      })

      socket.on('SESSION_RECONNECTED', () => {
        this.clearDisconnectTimeout()
        this.clearInactiveTimeout()
        this.setStatus(ConnectionStatus.Connected)
      })

      socket.on('UPDATE_SESSION', (evData) => {
        const { meta = {}, data = {} } = evData
        const { tabId } = meta
        const usedData = this.assistVersion === 1 ? evData : data
        const { active } = usedData
        const currentTab = this.store.get().currentTab
        this.clearDisconnectTimeout()
        !this.inactiveTimeout && this.setStatus(ConnectionStatus.Connected)
        if (typeof active === "boolean") {
          this.clearInactiveTimeout()
          if (active) {
            this.setStatus(ConnectionStatus.Connected)
            this.inactiveTabs = this.inactiveTabs.filter(t => t !== tabId)
          } else {
            if (!this.inactiveTabs.includes(tabId)) {
              this.inactiveTabs.push(tabId)
            }
            if (tabId === undefined || tabId === currentTab) {
              this.inactiveTimeout = setTimeout(() => {
                // @ts-ignore
                const tabs = this.store.get().tabs
                if (this.inactiveTabs.length === tabs.size) {
                  this.setStatus(ConnectionStatus.Inactive)
                }
              }, 10000)
            }
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

      this.screenRecording = new ScreenRecording(
        this.store,
        socket,
        () => this.screen.setBorderStyle(this.borderStyle),
        this.uiErrorHandler,
        this.getAssistVersion,
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

  /* ==== Cleaning ==== */
  private cleaned = false
  clean() {
    this.cleaned = true // sometimes cleaned before modules loaded
    this.socket?.close()
    this.socket = null
    this.clearDisconnectTimeout()
    this.clearInactiveTimeout()
    this.socketCloseTimeout && clearTimeout(this.socketCloseTimeout)
    document.removeEventListener('visibilitychange', this.onVisChange)
  }
}
