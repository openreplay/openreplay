import { userStore } from 'App/mstore';
import logger from '@/logger';
import type { LocalStream } from './LocalStream';
import type { Socket } from './types';
import type { Store } from '../../common/types';

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

export default class Call {
  private assistVersion = 1;

  static readonly INITIAL_STATE: Readonly<State> = {
    calling: CallingState.NoCall,
  };

  private connections: Record<string, RTCPeerConnection> = {};

  private connectAttempts = 0;

  private videoStreams: Record<string, MediaStreamTrack> = {};

  private callID: string;

  private agentInCallIds: string[] = [];

  constructor(
    private store: Store<State & { tabs: Set<string> }>,
    private socket: Socket,
    private config: RTCIceServer[],
    private peerID: string,
    private getAssistVersion: () => number,
    private agent: Record<string, any>,
    private agentIds: string[],
  ) {
    socket.on('WEBRTC_AGENT_CALL', (data) => {
      switch (data.type) {
        case WEBRTC_CALL_AGENT_EVENT_TYPES.OFFER:
          this.handleOffer(data, true);
          break;
        case WEBRTC_CALL_AGENT_EVENT_TYPES.ICE_CANDIDATE:
          this.handleIceCandidate(data);
          break;
        case WEBRTC_CALL_AGENT_EVENT_TYPES.ANSWER:
          this.handleAnswer(data, true);
        default:
          break;
      }
    });

    socket.on('UPDATE_SESSION', (data: { data: { agentIds: string[] } }) => {
      this.callAgentsInSession({ agentIds: data.data.agentIds });
    });

    socket.on('call_end', () => {
      this.onRemoteCallEnd();
    });

    socket.on(
      'videofeed',
      (data: { data: { streamId: string; enabled: boolean } }) => {
        const { streamId, enabled } = data.data;
        if (this.videoStreams[streamId]) {
          this.videoStreams[streamId].enabled = enabled;
        }
      },
    );
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
        // When the connection is restored, we initiate a re-creation of the connection
        this._callSessionPeer();
        reconnecting = false;
      }
    });
    socket.on('messages', () => {
      if (reconnecting) {
        this._callSessionPeer();
        reconnecting = false;
      }
    });
    socket.on('disconnect', () => {
      this.store.update({ calling: CallingState.NoCall });
    });

    socket.on(
      'webrtc_call_offer',
      (data: { data: { from: string; offer: RTCSessionDescriptionInit } }) => {
        this.handleOffer(data.data);
      },
    );

    socket.on(
      'webrtc_call_answer',
      (data: { data: { from: string; answer: RTCSessionDescriptionInit } }) => {
        this.handleAnswer(data.data);
      },
    );
    socket.on(
      'webrtc_call_ice_candidate',
      (data: { data: { from: string; candidate: RTCIceCandidateInit } }) => {
        this.handleIceCandidate({
          candidate: data.data.candidate,
          from: data.data.from,
        });
      },
    );

    this.assistVersion = this.getAssistVersion();
  }

  // CREATE A LOCAL PEER
  private async createPeerConnection({
    remotePeerId,
    localPeerId,
    isAgent,
  }: {
    remotePeerId: string;
    isAgent?: boolean;
    localPeerId?: string;
  }): Promise<RTCPeerConnection> {
    // create pc with ice config

    const pc = new RTCPeerConnection({
      iceServers: this.config,
    });

    // If there is a local stream, add its tracks to the connection
    if (
      this.callArgs &&
      this.callArgs.localStream &&
      this.callArgs.localStream.stream
    ) {
      this.callArgs.localStream.stream.getTracks().forEach((track) => {
        pc.addTrack(track, this.callArgs!.localStream.stream);
      });
    }

    // when ice is ready we send it
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        if (isAgent) {
          this.socket.emit('WEBRTC_AGENT_CALL', {
            from: localPeerId,
            candidate: event.candidate,
            toAgentId: getSocketIdByCallId(remotePeerId),
            type: WEBRTC_CALL_AGENT_EVENT_TYPES.ICE_CANDIDATE,
          });
        } else {
          this.socket.emit('webrtc_call_ice_candidate', {
            from: remotePeerId,
            candidate: event.candidate,
          });
        }
      } else {
        logger.log('ICE candidate gathering complete');
      }
    };

    // when we receive a remote track, we write it to videoStreams[peerId]
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream && !this.videoStreams[remotePeerId]) {
        this.videoStreams[remotePeerId] = stream.getVideoTracks()[0];
        if (this.store.get().calling !== CallingState.OnCall) {
          this.store.update({ calling: CallingState.OnCall });
        }
        if (this.callArgs) {
          this.callArgs.onStream(
            stream,
            remotePeerId !== this.callID && isAgentId(remotePeerId),
          );
        }
      }
    };

    // If the connection is lost, we end the call
    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed'
      ) {
        this.onRemoteCallEnd();
      }
    };

    // Handle track replacement when local video changes
    if (this.callArgs && this.callArgs.localStream) {
      this.callArgs.localStream.onVideoTrack((vTrack: MediaStreamTrack) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (!sender) {
          logger.warn('No video sender found');
          return;
        }
        sender.replaceTrack(vTrack);
      });
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
    try {
      // Create RTCPeerConnection with client
      const pc = await this.createPeerConnection({
        remotePeerId,
        localPeerId,
        isAgent,
      });
      this.connections[remotePeerId] = pc;

      // Create an SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Sending offer
      if (isAgent) {
        this.socket.emit('WEBRTC_AGENT_CALL', {
          from: localPeerId,
          offer,
          toAgentId: socketId,
          type: WEBRTC_CALL_AGENT_EVENT_TYPES.OFFER,
        });
      } else {
        this.socket.emit('webrtc_call_offer', { from: remotePeerId, offer });
      }
      this.connectAttempts = 0;
    } catch (e: any) {
      logger.error(e);
      // Trying to reconnect
      const tryReconnect = async (error: any) => {
        if (error.type === 'peer-unavailable' && this.connectAttempts < 5) {
          this.connectAttempts++;
          logger.log('reconnecting', this.connectAttempts);
          await new Promise((resolve) => setTimeout(resolve, 250));
          await this._peerConnection({ remotePeerId });
        } else {
          logger.log('error', this.connectAttempts);
          this.callArgs?.onError?.(
            'Could not establish a connection with the peer after 5 attempts',
          );
        }
      };
      await tryReconnect(e);
    }
  }

  // Process the received offer to answer
  private async handleOffer(
    data: { from: string; offer: RTCSessionDescriptionInit },
    isAgent?: boolean,
  ) {
    // set to remotePeerId data.from
    logger.log('RECEIVED OFFER', data);
    const fromCallId = data.from;
    let pc = this.connections[fromCallId];
    if (!pc) {
      if (isAgent) {
        this.connections[fromCallId] = await this.createPeerConnection({
          remotePeerId: fromCallId,
          isAgent,
          localPeerId: this.callID,
        });
        pc = this.connections[fromCallId];
      } else {
        logger.error('No connection found for remote peer', fromCallId);
        return;
      }
    }
    try {
      // if the connection is not established yet, then set remoteDescription to peer
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (isAgent) {
        this.socket.emit('WEBRTC_AGENT_CALL', {
          from: this.callID,
          answer,
          toAgentId: getSocketIdByCallId(fromCallId),
          type: WEBRTC_CALL_AGENT_EVENT_TYPES.ANSWER,
        });
      } else {
        this.socket.emit('webrtc_call_answer', { from: fromCallId, answer });
      }
    } catch (e) {
      logger.error('Error setting remote description from answer', e);
      this.callArgs?.onError?.(e);
    }
  }

  // Process the received answer to offer
  private async handleAnswer(
    data: { from: string; answer: RTCSessionDescriptionInit },
    isAgent?: boolean,
  ) {
    // set to remotePeerId data.from
    logger.log('RECEIVED ANSWER', data);
    if (this.agentInCallIds.includes(data.from) && !isAgent) {
      return;
    }
    const callId = data.from;
    const pc = this.connections[callId];
    if (!pc) {
      logger.error(
        'No connection found for remote peer',
        callId,
        this.connections,
      );
      return;
    }
    try {
      // if the connection is not established yet, then set remoteDescription to peer
      if (pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
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
    candidate: RTCIceCandidateInit;
  }) {
    const callId = data.from;
    const pc = this.connections[callId];
    if (!pc) return;
    // if there are ice candidates then add candidate to peer
    if (data.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        logger.error('Error adding ICE candidate', e);
      }
    } else {
      logger.warn('Invalid ICE candidate skipped:', data.candidate);
    }
  }

  // handle call ends
  private handleCallEnd() {
    // If the call is not completed, then call onCallEnd
    if (this.store.get().calling !== CallingState.NoCall) {
      this.callArgs && this.callArgs.onRemoteCallEnd();
    }
    // change state to NoCall
    this.store.update({ calling: CallingState.NoCall });
    // Close all created RTCPeerConnection
    Object.values(this.connections).forEach((pc) => pc.close());
    this.callArgs?.onRemoteCallEnd();
    // Clear connections
    this.connections = {};
    this.callArgs = null;
    this.videoStreams = {};
    this.callArgs = null;
  }

  // Call completion event handler by signal
  private onRemoteCallEnd = () => {
    if (
      [CallingState.Requesting, CallingState.Connecting].includes(
        this.store.get().calling,
      )
    ) {
      // If the call has not started yet, then call onReject
      this.callArgs && this.callArgs.onReject();
      // Close all connections and reset callArgs
      Object.values(this.connections).forEach((pc) => pc.close());
      this.connections = {};
      this.callArgs?.onRemoteCallEnd();
      this.store.update({ calling: CallingState.NoCall });
      this.callArgs = null;
    } else {
      // Call the full call completion handler
      this.handleCallEnd();
    }
  };

  // Ends the call and sends the call_end signal
  initiateCallEnd = async () => {
    this.emitData('call_end', this.callID);
    this.handleCallEnd();
  };

  private emitData = (event: string, data?: any) => {
    if (this.getAssistVersion() === 1) {
      this.socket?.emit(event, data);
    } else {
      this.socket?.emit(event, {
        meta: { tabId: this.store.get().currentTab },
        data,
      });
    }
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
    // this.callAgentsInSession({ agentIds: this.agentInCallIds });
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
    if (
      ![CallingState.NoCall, CallingState.Reconnecting].includes(
        this.store.get().calling,
      )
    ) {
      return;
    }
    this.store.update({ calling: CallingState.Connecting });
    const tab = this.store.get().currentTab;
    if (!tab) {
      logger.warn('No tab data to connect to peer');
    }

    // Generate a peer identifier depending on the assist version
    this.callID = this.getCallId();

    const userName = userStore.account.name;
    this.emitData('_agent_name', userName);
    void this._peerConnection({ remotePeerId: this.callID });
  }

  private callAgentsInSession({ agentIds }: { agentIds: string[] }) {
    if (agentIds) {
      const filteredAgentIds = agentIds.filter(
        (id: string) => id.split('-')[3] !== this.agent.id.toString(),
      );
      const newIds = filteredAgentIds.filter(
        (id: string) => !this.agentInCallIds.includes(id),
      );
      const removedIds = this.agentInCallIds.filter(
        (id: string) => !filteredAgentIds.includes(id),
      );
      removedIds.forEach((id: string) => this.agentDisconnected(id));
      if (this.store.get().calling === CallingState.OnCall) {
        newIds.forEach((id: string) => {
          const socketId = getSocketIdByCallId(id);
          this._peerConnection({
            remotePeerId: id,
            isAgent: true,
            socketId,
            localPeerId: this.callID,
          });
        });
      }

      this.agentInCallIds = filteredAgentIds;
    }
  }

  private getCallId() {
    const tab = this.store.get().currentTab;
    if (!tab) {
      logger.warn('No tab data to connect to peer');
    }

    // Generate a peer identifier depending on the assist version
    return `${this.peerID}-${tab || Array.from(this.store.get().tabs)[0]}-${this.agent.id}-${this.socket.id}-agent`;
  }

  agentDisconnected(agentId: string) {
    this.connections[agentId]?.close();
    delete this.connections[agentId];
  }

  // Method for clearing resources
  clean() {
    void this.initiateCallEnd();
    Object.values(this.connections).forEach((pc) => pc.close());
    this.connections = {};
    this.callArgs?.onLocalCallEnd();
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
