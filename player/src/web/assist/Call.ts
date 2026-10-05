import { getPlayerConfig } from '../../config';
import logger from '../../logger';
import type { LocalStream } from './LocalStream';
import type { Socket } from './types';
import type { Store } from '../../common/types';
import { createEmitter, listen, unwrap } from './utils';

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

const WEBRTC_CALL_AGENT_EVENT_TYPES = {
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',
};

/** `disconnected` often recovers by itself (network switch); only give up after this long. */
const PEER_DISCONNECT_GRACE = 8000;
type AgentCallPayload = {
  type: string;
  from: string;
  toAgentId?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export default class Call {
  static readonly INITIAL_STATE: Readonly<State> = {
    calling: CallingState.NoCall,
  };

  private connections: Record<string, RTCPeerConnection> = {};

  private videoStreams: Record<string, MediaStreamTrack> = {};

  private videoTrackUnsubscribers: Record<string, () => void> = {};

  private peerDisconnectTimers: Record<string, ReturnType<typeof setTimeout>> =
    {};

  /** Set when the user's tab went away mid-call; the call is redialed once messages resume. */
  private reconnecting = false;

  private callID: string;

  private agentInCallIds: string[] = [];

  private readonly unsubscribe: () => void;

  private readonly emitData: (event: string, data?: any) => void;

  constructor(
    private store: Store<State & { tabs: Set<string> }>,
    private socket: Socket,
    private config: RTCIceServer[],
    private peerID: string,
    getAssistVersion: () => number,
    private agent: Record<string, any>,
  ) {
    this.emitData = createEmitter(
      socket,
      getAssistVersion,
      () => this.store.get().currentTab,
    );
    const onMessagesResumed = () => {
      if (
        this.reconnecting &&
        this.callArgs &&
        this.store.get().calling === CallingState.Reconnecting
      ) {
        this.reconnecting = false;
        this._callSessionPeer();
      }
    };
    this.unsubscribe = listen(socket, {
      WEBRTC_AGENT_CALL: (raw) => {
        const data = unwrap<AgentCallPayload>(raw);
        if (!data) return;
        switch (data.type) {
          case WEBRTC_CALL_AGENT_EVENT_TYPES.OFFER:
            void this.handleOffer(data, true);
            break;
          case WEBRTC_CALL_AGENT_EVENT_TYPES.ICE_CANDIDATE:
            void this.handleIceCandidate(data);
            break;
          case WEBRTC_CALL_AGENT_EVENT_TYPES.ANSWER:
            void this.handleAnswer(data, true);
            break;
        }
      },
      UPDATE_SESSION: (raw) => {
        const agentIds = unwrap<{ agentIds?: string[] }>(raw)?.agentIds;
        if (Array.isArray(agentIds)) {
          this.callAgentsInSession(agentIds);
        }
      },
      call_end: () => this.onRemoteCallEnd(),
      videofeed: (raw) => {
        const feed = unwrap<{ streamId: string; enabled: boolean }>(raw);
        const track = feed && this.videoStreams[feed.streamId];
        if (track) {
          track.enabled = feed.enabled;
        }
      },
      SESSION_DISCONNECTED: () => {
        const { calling } = this.store.get();
        if (calling === CallingState.OnCall) {
          this.store.update({ calling: CallingState.Reconnecting });
          this.reconnecting = true;
        } else if (
          calling === CallingState.Requesting ||
          calling === CallingState.Connecting
        ) {
          // the user's tab went away while ringing: not a rejection
          this.handleCallEnd('remote');
        }
      },
      messages_gz: onMessagesResumed,
      messages: onMessagesResumed,
      // signaling is gone: release media instead of showing "no call" with a live mic
      disconnect: () => this.handleCallEnd('remote'),
      webrtc_call_offer: (raw) => {
        const data = unwrap<{ from: string; offer: RTCSessionDescriptionInit }>(
          raw,
        );
        if (data) void this.handleOffer(data);
      },
      webrtc_call_answer: (raw) => {
        const data = unwrap<{
          from: string;
          answer: RTCSessionDescriptionInit;
        }>(raw);
        if (data) void this.handleAnswer(data);
      },
      webrtc_call_ice_candidate: (raw) => {
        const data = unwrap<{ from: string; candidate: RTCIceCandidateInit }>(
          raw,
        );
        if (data) void this.handleIceCandidate(data);
      },
    });
  }

  private emitAgentCall(payload: AgentCallPayload) {
    this.socket.emit('WEBRTC_AGENT_CALL', payload);
  }

  /** Closes and forgets everything held for one peer. */
  private closePeer(remotePeerId: string) {
    const pc = this.connections[remotePeerId];
    delete this.connections[remotePeerId];
    pc?.close();
    delete this.videoStreams[remotePeerId];
    this.videoTrackUnsubscribers[remotePeerId]?.();
    delete this.videoTrackUnsubscribers[remotePeerId];
    clearTimeout(this.peerDisconnectTimers[remotePeerId]);
    delete this.peerDisconnectTimers[remotePeerId];
  }

  private onPeerLost(remotePeerId: string) {
    if (remotePeerId === this.callID) {
      this.onRemoteCallEnd();
    } else {
      // another agent dropping out must not end the call with the user
      this.agentDisconnected(remotePeerId);
    }
  }

  // CREATE A LOCAL PEER
  private createPeerConnection({
    remotePeerId,
    localPeerId,
    isAgent,
    socketId,
  }: {
    remotePeerId: string;
    isAgent?: boolean;
    localPeerId?: string;
    socketId?: string;
  }): RTCPeerConnection {
    // a reconnect reuses the same call id: the previous connection must not linger
    this.closePeer(remotePeerId);
    const pc = new RTCPeerConnection({
      iceServers: this.config,
    });
    this.connections[remotePeerId] = pc;
    const isCurrent = () => this.connections[remotePeerId] === pc;

    const localStream = this.callArgs?.localStream;
    if (localStream?.stream) {
      localStream.stream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.stream);
      });
    }

    pc.onicecandidate = (event) => {
      if (!isCurrent()) return;
      if (!event.candidate) {
        logger.log('ICE candidate gathering complete');
        return;
      }
      if (isAgent) {
        this.emitAgentCall({
          from: localPeerId!,
          candidate: event.candidate,
          toAgentId: socketId ?? getSocketIdByCallId(remotePeerId),
          type: WEBRTC_CALL_AGENT_EVENT_TYPES.ICE_CANDIDATE,
        });
      } else {
        this.socket.emit('webrtc_call_ice_candidate', {
          from: remotePeerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (!isCurrent()) return;
      const stream = event.streams[0];
      if (!stream || this.videoStreams[remotePeerId]) return;
      this.videoStreams[remotePeerId] = stream.getVideoTracks()[0];
      if (this.store.get().calling !== CallingState.OnCall) {
        this.store.update({ calling: CallingState.OnCall });
      }
      this.callArgs?.onStream(
        stream,
        remotePeerId !== this.callID && isAgentId(remotePeerId),
      );
    };

    pc.onconnectionstatechange = () => {
      if (!isCurrent()) return;
      const state = pc.connectionState;
      if (state === 'connected') {
        clearTimeout(this.peerDisconnectTimers[remotePeerId]);
        delete this.peerDisconnectTimers[remotePeerId];
      } else if (state === 'disconnected') {
        clearTimeout(this.peerDisconnectTimers[remotePeerId]);
        this.peerDisconnectTimers[remotePeerId] = setTimeout(() => {
          if (isCurrent() && pc.connectionState !== 'connected') {
            this.onPeerLost(remotePeerId);
          }
        }, PEER_DISCONNECT_GRACE);
      } else if (state === 'failed') {
        this.onPeerLost(remotePeerId);
      }
    };

    if (localStream) {
      this.videoTrackUnsubscribers[remotePeerId] = localStream.onVideoTrack(
        (vTrack: MediaStreamTrack) => {
          if (!isCurrent()) return;
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (!sender) {
            logger.warn('No video sender found');
            return;
          }
          void sender.replaceTrack(vTrack);
        },
      );
    }

    return pc;
  }

  // ESTABLISHING A CONNECTION
  private async _peerConnection({
    remotePeerId,
    isAgent,
    socketId,
    localPeerId,
  }: {
    remotePeerId: string;
    isAgent?: boolean;
    socketId?: string;
    localPeerId?: string;
  }) {
    let pc: RTCPeerConnection | undefined;
    try {
      pc = this.createPeerConnection({
        remotePeerId,
        localPeerId,
        isAgent,
        socketId,
      });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (this.connections[remotePeerId] !== pc) return;

      if (isAgent) {
        this.emitAgentCall({
          from: localPeerId!,
          offer,
          toAgentId: socketId,
          type: WEBRTC_CALL_AGENT_EVENT_TYPES.OFFER,
        });
      } else {
        this.socket.emit('webrtc_call_offer', { from: remotePeerId, offer });
      }
    } catch (e: any) {
      logger.error(e);
      // a redial replaced (and closed) this peer: its failure is not the call's
      if (pc && this.connections[remotePeerId] !== pc) return;
      if (isAgent) {
        this.agentDisconnected(remotePeerId);
      } else {
        this.callArgs?.onError?.('Could not establish a connection with the peer');
        this.handleCallEnd('remote');
      }
    }
  }

  // Process the received offer to answer
  private async handleOffer(
    data: {
      from: string;
      offer?: RTCSessionDescriptionInit;
    },
    isAgent?: boolean,
  ) {
    logger.log('RECEIVED OFFER', data);
    const fromCallId = data.from;
    try {
      let pc = this.connections[fromCallId];
      if (!pc) {
        if (!isAgent) {
          logger.error('No connection found for remote peer', fromCallId);
          return;
        }
        pc = this.createPeerConnection({
          remotePeerId: fromCallId,
          isAgent,
          localPeerId: this.callID,
        });
      }
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer!));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (isAgent) {
        this.emitAgentCall({
          from: this.callID,
          answer,
          toAgentId: getSocketIdByCallId(fromCallId),
          type: WEBRTC_CALL_AGENT_EVENT_TYPES.ANSWER,
        });
      } else {
        this.socket.emit('webrtc_call_answer', { from: fromCallId, answer });
      }
    } catch (e) {
      logger.error('Error answering offer', e);
      this.callArgs?.onError?.(e);
    }
  }

  // Process the received answer to offer
  private async handleAnswer(
    data: { from: string; answer?: RTCSessionDescriptionInit },
    isAgent?: boolean,
  ) {
    logger.log('RECEIVED ANSWER', data);
    if (this.agentInCallIds.includes(data.from) && !isAgent) {
      return;
    }
    const pc = this.connections[data.from];
    if (!pc) {
      logger.error('No connection found for remote peer', data.from);
      return;
    }
    try {
      if (pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer!));
      } else {
        logger.warn('Skipping setRemoteDescription: Already in stable state');
      }
    } catch (e) {
      logger.error('Error setting remote description from answer', e);
      this.callArgs?.onError?.(e);
    }
  }

  // process the received iceCandidate
  private async handleIceCandidate(data: {
    from: string;
    candidate?: RTCIceCandidateInit;
  }) {
    const pc = this.connections[data.from];
    if (!pc) return;
    if (!data.candidate) {
      logger.warn('Invalid ICE candidate skipped:', data.candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
      logger.error('Error adding ICE candidate', e);
    }
  }

  /** Tears the call down and notifies the UI exactly once. */
  private handleCallEnd(reason: 'local' | 'remote') {
    const wasInCall = this.store.get().calling !== CallingState.NoCall;
    this.reconnecting = false;
    Object.keys(this.connections).forEach((id) => this.closePeer(id));
    this.videoStreams = {};
    this.store.update({ calling: CallingState.NoCall });
    const args = this.callArgs;
    this.callArgs = null;
    if (wasInCall && args) {
      if (reason === 'local') {
        args.onLocalCallEnd();
      } else {
        args.onRemoteCallEnd();
      }
    }
  }

  // Call completion event handler by signal
  private onRemoteCallEnd = () => {
    const { calling } = this.store.get();
    if (
      calling === CallingState.Requesting ||
      calling === CallingState.Connecting
    ) {
      // the call never started: the user rejected it
      this.callArgs?.onReject();
    }
    this.handleCallEnd('remote');
  };

  // Ends the call and sends the call_end signal
  initiateCallEnd = async () => {
    if (this.store.get().calling !== CallingState.NoCall) {
      this.emitData('call_end', this.callID);
    }
    this.handleCallEnd('local');
  };

  private callArgs: {
    localStream: LocalStream;
    onStream: (s: MediaStream, isAgent: boolean) => void;
    onRemoteCallEnd: () => void;
    onLocalCallEnd: () => void;
    onReject: () => void;
    onError?: (arg?: any) => void;
  } | null = null;

  setCallArgs(
    localStream: LocalStream,
    onStream: (s: MediaStream, isAgent: boolean) => void,
    onRemoteCallEnd: () => void,
    onLocalCallEnd: () => void,
    onReject: () => void,
    onError?: (e?: any) => void,
  ) {
    this.callArgs = {
      localStream,
      onStream,
      onRemoteCallEnd,
      onLocalCallEnd,
      onReject,
      onError,
    };
  }

  // Initiates a call
  call(): { end: () => void } {
    this._callSessionPeer();
    return {
      end: this.initiateCallEnd,
    };
  }

  // Notify peers of local video state change
  toggleVideoLocalStream(enabled: boolean) {
    this.emitData('videofeed', { streamId: this.callID, enabled });
  }

  // Calls the method to create a connection with a peer
  private _callSessionPeer() {
    const { calling } = this.store.get();
    if (calling !== CallingState.NoCall && calling !== CallingState.Reconnecting) {
      return;
    }
    this.store.update({ calling: CallingState.Connecting });
    if (this.callID) {
      // the tab id (part of the call id) may change after the user's reload
      this.closePeer(this.callID);
    }
    this.callID = this.getCallId();

    const userName = getPlayerConfig().getUserName?.() ?? 'Agent';
    this.emitData('_agent_name', userName);
    void this._peerConnection({ remotePeerId: this.callID });
  }

  /**
   * Agent-to-agent connections are not opened: the assist servers never deliver
   * WEBRTC_AGENT_CALL (they read `handshake.sessionData`, which is never set), so
   * each connection would only gather ICE / allocate TURN for nothing.
   */
  private callAgentsInSession(agentIds: string[]) {
    const ownAgentId = this.agent.id.toString();
    this.agentInCallIds = agentIds.filter(
      (id) => id.split('-')[3] !== ownAgentId,
    );
  }

  private getCallId() {
    const tab = this.store.get().currentTab;
    if (!tab) {
      logger.warn('No tab data to connect to peer');
    }
    return `${this.peerID}-${tab || Array.from(this.store.get().tabs)[0]}-${this.agent.id}-${this.socket.id}-agent`;
  }

  agentDisconnected(agentCallId: string) {
    this.closePeer(agentCallId);
  }

  // Method for clearing resources
  clean() {
    this.unsubscribe();
    void this.initiateCallEnd();
  }
}

function isAgentId(id: string): boolean {
  return id.endsWith('_agent');
}

function getSocketIdByCallId(callId?: string): string | undefined {
  const socketIdRegex = /-\d{2}-(.*?)\-agent/;
  const match = callId?.match(socketIdRegex);
  if (match) {
    return match[1];
  }
}
