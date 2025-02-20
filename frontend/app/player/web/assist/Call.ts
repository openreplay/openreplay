import type { LocalStream } from './LocalStream';
import type { Socket } from './types';
import type { Store } from '../../common/types';
import { userStore } from "App/mstore";

export enum CallingState {
  NoCall,
  Connecting,
  Requesting,
  Reconnecting,
  OnCall,
}

export interface State {
  calling: CallingState;
  currentTab?: string;
}

export default class Call {
  private assistVersion = 1;
  static readonly INITIAL_STATE: Readonly<State> = {
    calling: CallingState.NoCall,
  };

  private connections: Record<string, RTCPeerConnection> = {};
  private connectAttempts = 0;
  private videoStreams: Record<string, MediaStreamTrack> = {};

  constructor(
    private store: Store<State & { tabs: Set<string> }>,
    private socket: Socket,
    private config: RTCIceServer[] | null,
    private peerID: string,
    private getAssistVersion: () => number
  ) {
    // Обработка событий сокета
    socket.on('call_end', () => {
      this.onRemoteCallEnd()
    });

    socket.on('videofeed', (data: { data: { streamId: string; enabled: boolean }}) => {
      const { streamId, enabled } = data.data;
      if (this.videoStreams[streamId]) {
        this.videoStreams[streamId].enabled = enabled;
      }
    });
    let reconnecting = false;
    socket.on('SESSION_DISCONNECTED', () => {
      if (this.store.get().calling === CallingState.OnCall) {
        this.store.update({ calling: CallingState.Reconnecting });
        reconnecting = true;
      } else if (this.store.get().calling === CallingState.Requesting) {
        this.store.update({ calling: CallingState.NoCall });
      }
    });
    socket.on('messages_gz', () => {
      if (reconnecting) {
        // При восстановлении соединения инициируем повторное создание соединения
        this._callSessionPeer();
        reconnecting = false;
      }
    })
    socket.on('messages', () => {
      if (reconnecting) {
        this._callSessionPeer();
        reconnecting = false;
      }
    });
    socket.on('disconnect', () => {
      this.store.update({ calling: CallingState.NoCall });
    });

    socket.on('webrtc_call_answer', (data: { data: { from: string, answer: RTCSessionDescriptionInit } }) => {
      this.handleAnswer(data.data);
    });
    socket.on('webrtc_call_ice_candidate', (data: { data: { from: string, candidate: RTCIceCandidateInit } }) => {
      this.handleIceCandidate({ candidate: data.data.candidate, from: data.data.from });
    });

    this.assistVersion = this.getAssistVersion();
  }

  // СОЗДАНИЕ ЛОКАЛЬНОГО ПИРА
  private async createPeerConnection(remotePeerId: string): Promise<RTCPeerConnection> {
    // создаем pc с конфигом ice
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Если есть локальный поток добавляем его треки в соединение
    if (this.callArgs && this.callArgs.localStream && this.callArgs.localStream.stream) {
      this.callArgs.localStream.stream.getTracks().forEach((track) => {
        pc.addTrack(track, this.callArgs!.localStream.stream);
      });
    }

    // когда готов ice отсылваем его
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc_call_ice_candidate', { from: remotePeerId, candidate: event.candidate });
      } else {
        console.log("Сбор ICE-кандидатов завершён");
      }
    };

    // когда получаем удаленный трек записываем его в videoStreams[peerId]
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        this.videoStreams[remotePeerId] = stream.getVideoTracks()[0];
        if (this.store.get().calling !== CallingState.OnCall) {
          this.store.update({ calling: CallingState.OnCall });
        }
        if (this.callArgs) {
          this.callArgs.onStream(stream);
        }
          try {
        
            // Создаем элемент <video>
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.srcObject = stream;
        
            // Добавляем <video> в <body>
            document.body.appendChild(video);
          } catch (error) {
            console.error('Error accessing media devices:', error);
          }
      }
    };

    // Если связь отвалилась заканчиваем звонок
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        this.onRemoteCallEnd();
      }
    };

    // Обработка замены трека при изменении локального видео
    if (this.callArgs && this.callArgs.localStream) {
      this.callArgs.localStream.onVideoTrack((vTrack: MediaStreamTrack) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (!sender) {
          console.warn('No video sender found');
          return;
        }
        sender.replaceTrack(vTrack);
      });
    }

    return pc;
  }

  // УСТАНОВКА СОЕДИНЕНИЯ
  private async _peerConnection(remotePeerId: string) {
    try {
      // Создаём RTCPeerConnection
      const pc = await this.createPeerConnection(remotePeerId);
      this.connections[remotePeerId] = pc;

      // Создаём SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Отправляем offer 
      this.socket.emit('webrtc_call_offer', { from: remotePeerId, offer });
      this.connectAttempts = 0;
    } catch (e: any) {
      console.error(e);
      // Пробуем переподключиться
      const tryReconnect = async (error: any) => {
        if (error.type === 'peer-unavailable' && this.connectAttempts < 5) {
          this.connectAttempts++;
          console.log('reconnecting', this.connectAttempts);
          await new Promise((resolve) => setTimeout(resolve, 250));
          await this._peerConnection(remotePeerId);
        } else {
          console.log('error', this.connectAttempts);
          this.callArgs?.onError?.('Could not establish a connection with the peer after 5 attempts');
        }
      };
      await tryReconnect(e);
    }
  }

  // Обрабатываем полученный answer на offer
  private async handleAnswer(data: { from: string, answer: RTCSessionDescriptionInit }) {
    // устанавливаем в remotePeerId data.from
    const remotePeerId = data.from;
    // получаем peer
    const pc = this.connections[remotePeerId];
    if (!pc) {
      console.error("No connection found for remote peer", remotePeerId);
      return;
    }
    try {
      // если связь еще не установлена то устанвливаем remoteDescription в peer
      if (pc.signalingState !== "stable") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      } else {
        console.warn("Skipping setRemoteDescription: Already in stable state");
      }
    } catch (e) {
      console.error("Error setting remote description from answer", e);
      this.callArgs?.onError?.(e);
    }
  }

  // обрабатываем полученный iceCandidate 
  private async handleIceCandidate(data: { from: string, candidate: RTCIceCandidateInit }) {
    const remotePeerId = data.from;
    // получаем peer
    const pc = this.connections[remotePeerId];
    if (!pc) return;
    // если есть ice кандидаты
    if (data.candidate && (data.candidate.sdpMid || data.candidate.sdpMLineIndex !== null)) {
      try {
        // добавляем кандидат в peer
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error("Error adding ICE candidate", e);
      }
    } else {
      console.warn("Пропущен некорректный ICE-кандидат:", data.candidate);
    }
  }

  // обрабатываем окончания звонка
  private handleCallEnd() {
    // Если звонок не завершен, то вызываем onCallEnd
    if (this.store.get().calling !== CallingState.NoCall) {
      this.callArgs && this.callArgs.onCallEnd();
    }
    // меняем state на NoCall
    this.store.update({ calling: CallingState.NoCall });
    // Закрываем все созданные RTCPeerConnection
    Object.values(this.connections).forEach((pc) => pc.close());
    this.callArgs?.onCallEnd();
    // Очищаем connections
    this.connections = {};
    this.callArgs = null;
  }

  // Обработчик события завершения вызова по сигналу
  private onRemoteCallEnd = () => {
    if ([CallingState.Requesting, CallingState.Connecting].includes(this.store.get().calling)) {
      // Если вызов еще не начался, то вызываем onReject
      this.callArgs && this.callArgs.onReject();
      // Закрываем все соединения и обнуляем callArgs
      Object.values(this.connections).forEach((pc) => pc.close());
      this.connections = {};
      this.callArgs?.onCallEnd();
      this.store.update({ calling: CallingState.NoCall });
      this.callArgs = null;
    } else {
      // Вызываем полный обработчик завершения вызова
      this.handleCallEnd();
    }
  };

  // Завершает вызов и отправляет сигнал call_end
  initiateCallEnd = async () => {
    const userName = userStore.account.name;
    this.emitData('call_end', userName);
    this.handleCallEnd();
  };

  private emitData = (event: string, data?: any) => {
    if (this.getAssistVersion() === 1) {
      console.log('SEND EVENT', event)
      this.socket?.emit(event, data);
    } else {
      console.log('SEND EVENT', event)
      this.socket?.emit(event, { meta: { tabId: this.store.get().currentTab }, data });
    }
  };

  private callArgs: {
    localStream: LocalStream;
    onStream: (s: MediaStream) => void;
    onCallEnd: () => void;
    onReject: () => void;
    onError?: (arg?: any) => void;
  } | null = null;

  setCallArgs(
    localStream: LocalStream,
    onStream: (s: MediaStream) => void,
    onCallEnd: () => void,
    onReject: () => void,
    onError?: (e?: any) => void
  ) {
    this.callArgs = {
      localStream,
      onStream,
      onCallEnd,
      onReject,
      onError,
    };
  }

  /**
   * Инициирует вызов
   */
  call(thirdPartyPeers?: string[]): { end: () => void } {
    if (thirdPartyPeers && thirdPartyPeers.length > 0) {
      this.addPeerCall(thirdPartyPeers);
    } else {
      this._callSessionPeer();
    }
    return {
      end: this.initiateCallEnd,
    };
  }

  // Уведомление пиров об изменении состояния локального видео
  toggleVideoLocalStream(enabled: boolean) {
    // Передаём сигнал через socket
    this.emitData('videofeed', { streamId: this.peerID, enabled });
  }

  // Соединяемся с другими агентами
  addPeerCall(thirdPartyPeers: string[]) {
    thirdPartyPeers.forEach((peerId) => this._peerConnection(peerId));
  }

  // Вызывает метод создания соединения с пиром
  private _callSessionPeer() {
    if (![CallingState.NoCall, CallingState.Reconnecting].includes(this.store.get().calling)) {
      return;
    }
    this.store.update({ calling: CallingState.Connecting });
    const tab = this.store.get().currentTab;
    if (!tab) {
      console.warn('No tab data to connect to peer');
    }

    // Формируем идентификатор пира в зависимости от версии ассиста
    const peerId =
      this.getAssistVersion() === 1
        ? this.peerID
        : `${this.peerID}-${tab || Array.from(this.store.get().tabs)[0]}`;

    const userName = userStore.account.name;
    this.emitData('_agent_name', userName);
    void this._peerConnection(peerId);
  }

  // Метод для очистки ресурсов
  clean() {
    void this.initiateCallEnd();
    Object.values(this.connections).forEach((pc) => pc.close());
    this.connections = {};
    this.callArgs?.onCallEnd();
  }
}
