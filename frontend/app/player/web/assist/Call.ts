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
        // When the connection is restored, we initiate a re-creation of the connection
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

  // CREATE A LOCAL PEER
  private async createPeerConnection(remotePeerId: string): Promise<RTCPeerConnection> {
    // create pc with ice config
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // If there is a local stream, add its tracks to the connection
    if (this.callArgs && this.callArgs.localStream && this.callArgs.localStream.stream) {
      this.callArgs.localStream.stream.getTracks().forEach((track) => {
        pc.addTrack(track, this.callArgs!.localStream.stream);
      });
    }

    // when ice is ready we send it
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc_call_ice_candidate', { from: remotePeerId, candidate: event.candidate });
      } else {
        console.log("Сбор ICE-кандидатов завершён");
      }
    };

    // when we receive a remote track, we write it to videoStreams[peerId]
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
      }
    };

    // If the connection is lost, we end the call
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        this.onRemoteCallEnd();
      }
    };

    // Handle track replacement when local video changes
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

  // ESTABLISHING A CONNECTION
  private async _peerConnection(remotePeerId: string) {
    try {
      // Create RTCPeerConnection
      const pc = await this.createPeerConnection(remotePeerId);
      this.connections[remotePeerId] = pc;

      // Create an SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Sending offer
      this.socket.emit('webrtc_call_offer', { from: remotePeerId, offer });
      this.connectAttempts = 0;
    } catch (e: any) {
      console.error(e);
      // Trying to reconnect
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

  // Process the received answer to offer
  private async handleAnswer(data: { from: string, answer: RTCSessionDescriptionInit }) {
    // set to remotePeerId data.from
    const remotePeerId = data.from;
    const pc = this.connections[remotePeerId];
    if (!pc) {
      console.error("No connection found for remote peer", remotePeerId);
      return;
    }
    try {
      // if the connection is not established yet, then set remoteDescription to peer
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

  // process the received iceCandidate
  private async handleIceCandidate(data: { from: string, candidate: RTCIceCandidateInit }) {
    const remotePeerId = data.from;
    const pc = this.connections[remotePeerId];
    if (!pc) return;
    // if there are ice candidates then add candidate to peer
    if (data.candidate && (data.candidate.sdpMid || data.candidate.sdpMLineIndex !== null)) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error("Error adding ICE candidate", e);
      }
    } else {
      console.warn("Пропущен некорректный ICE-кандидат:", data.candidate);
    }
  }

  // handle call ends
  private handleCallEnd() {
    // If the call is not completed, then call onCallEnd
    if (this.store.get().calling !== CallingState.NoCall) {
      this.callArgs && this.callArgs.onCallEnd();
    }
    // change state to NoCall
    this.store.update({ calling: CallingState.NoCall });
    // Close all created RTCPeerConnection
    Object.values(this.connections).forEach((pc) => pc.close());
    this.callArgs?.onCallEnd();
    // Clear connections
    this.connections = {};
    this.callArgs = null;
  }

  // Call completion event handler by signal
  private onRemoteCallEnd = () => {
    if ([CallingState.Requesting, CallingState.Connecting].includes(this.store.get().calling)) {
      // If the call has not started yet, then call onReject
      this.callArgs && this.callArgs.onReject();
     // Close all connections and reset callArgs
      Object.values(this.connections).forEach((pc) => pc.close());
      this.connections = {};
      this.callArgs?.onCallEnd();
      this.store.update({ calling: CallingState.NoCall });
      this.callArgs = null;
    } else {
      // Call the full call completion handler
      this.handleCallEnd();
    }
  };

  // Ends the call and sends the call_end signal
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

  // Initiates a call
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

  // Notify peers of local video state change
  toggleVideoLocalStream(enabled: boolean) {
    this.emitData('videofeed', { streamId: this.peerID, enabled });
  }

  // Connect with other agents
  addPeerCall(thirdPartyPeers: string[]) {
    thirdPartyPeers.forEach((peerId) => this._peerConnection(peerId));
  }

  // Calls the method to create a connection with a peer
  private _callSessionPeer() {
    if (![CallingState.NoCall, CallingState.Reconnecting].includes(this.store.get().calling)) {
      return;
    }
    this.store.update({ calling: CallingState.Connecting });
    const tab = this.store.get().currentTab;
    if (!tab) {
      console.warn('No tab data to connect to peer');
    }

   // Generate a peer identifier depending on the assist version
    const peerId =
      this.getAssistVersion() === 1
        ? this.peerID
        : `${this.peerID}-${tab || Array.from(this.store.get().tabs)[0]}`;

    const userName = userStore.account.name;
    this.emitData('_agent_name', userName);
    void this._peerConnection(peerId);
  }

  // Method for clearing resources
  clean() {
    void this.initiateCallEnd();
    Object.values(this.connections).forEach((pc) => pc.close());
    this.connections = {};
    this.callArgs?.onCallEnd();
  }
}
