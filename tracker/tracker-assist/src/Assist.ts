/* eslint-disable @typescript-eslint/no-empty-function */
import type { Socket } from "socket.io-client";
import { connect } from "socket.io-client";
import type { Properties } from "csstype";
import { App } from "@openreplay/tracker";

import RequestLocalStream, { LocalStream } from "./LocalStream.js";
import { hasTag } from "./guards.js";
import RemoteControl, { RCStatus } from "./RemoteControl.js";
import CallWindow from "./CallWindow.js";
import AnnotationCanvas from "./AnnotationCanvas.js";
import ConfirmWindow from "./ConfirmWindow/ConfirmWindow.js";
import { callConfirmDefault } from "./ConfirmWindow/defaults.js";
import type { Options as ConfirmOptions } from "./ConfirmWindow/defaults.js";
import ScreenRecordingState from "./ScreenRecordingState.js";
import { pkgVersion } from "./version.js";
import Canvas from "./Canvas.js";
import { gzip } from "fflate";

type StartEndCallback = (agentInfo?: Record<string, any>) => (() => any) | void;

interface AgentInfo {
  config: string;
  email: string;
  id: number;
  name: string;
  peerId: string;
  query: string;
  socketId?: string;
}

export interface Options {
  onAgentConnect: StartEndCallback;
  onCallStart: StartEndCallback;
  onRemoteControlStart: StartEndCallback;
  onRecordingRequest?: (agentInfo: Record<string, any>) => any;
  onCallDeny?: () => any;
  onRemoteControlDeny?: (agentInfo: Record<string, any>) => any;
  onRecordingDeny?: (agentInfo: Record<string, any>) => any;
  onDragCamera?: (dx: number, dy: number) => void;
  session_calling_peer_key: string;
  session_control_peer_key: string;
  callConfirm: ConfirmOptions;
  controlConfirm: ConfirmOptions;
  recordingConfirm: ConfirmOptions;
  socketHost?: string;

  // @deprecated
  confirmText?: string;
  // @deprecated
  confirmStyle?: Properties;

  serverURL: string;
  callUITemplate?: string;
  compressionEnabled: boolean;
  /**
   * Minimum amount of messages in a batch to trigger compression run
   * @default 5000
   */
  compressionMinBatchSize: number;
}

enum CallingState {
  Requesting,
  True,
  False,
}

type OptionalCallback = (() => Record<string, unknown>) | void;
type Agent = {
  onDisconnect?: OptionalCallback;
  onControlReleased?: OptionalCallback;
  agentInfo: AgentInfo | undefined;
  //
};

export default class Assist {
  readonly version = pkgVersion;

  private socket: Socket | null = null;
  private calls: Map<string, RTCPeerConnection> = new Map();
  private canvasPeers: { [id: number]: RTCPeerConnection | null } = {};
  private canvasNodeCheckers: Map<number, any> = new Map();
  private assistDemandedRestart = false;
  private callingState: CallingState = CallingState.False;
  private remoteControl: RemoteControl | null = null;
  private peerReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private agents: Record<string, Agent> = {};
  private config: RTCIceServer[] | undefined;
  private readonly options: Options;
  private readonly canvasMap: Map<number, Canvas> = new Map();
  private iceCandidatesBuffer: Map<string, RTCIceCandidateInit[]> = new Map();

  constructor(
    private readonly app: App,
    options?: Partial<Options>,
    private readonly noSecureMode: boolean = false
  ) {
    // @ts-ignore
    window.__OR_ASSIST_VERSION = this.version;
    this.options = Object.assign(
      {
        session_calling_peer_key: "__openreplay_calling_peer",
        session_control_peer_key: "__openreplay_control_peer",
        config: null,
        serverURL: null,
        onCallStart: () => {},
        onAgentConnect: () => {},
        onRemoteControlStart: () => {},
        onDragCamera: () => {},
        callConfirm: {},
        controlConfirm: {}, // TODO: clear options passing/merging/overwriting
        recordingConfirm: {},
        socketHost: "",
        compressionEnabled: false,
        compressionMinBatchSize: 5000,
      },
      options
    );

    if (this.app.options.assistSocketHost) {
      this.options.socketHost = this.app.options.assistSocketHost;
    }

    if (document.hidden !== undefined) {
      const sendActivityState = (): void =>
        this.emit("UPDATE_SESSION", { active: !document.hidden });
      app.attachEventListener(
        document,
        "visibilitychange",
        sendActivityState,
        false,
        false
      );
    }
    const titleNode = document.querySelector("title");
    const observer =
      titleNode &&
      new MutationObserver(() => {
        this.emit("UPDATE_SESSION", { pageTitle: document.title });
      });
    app.addOnUxtCb((uxtId: number) => {
      this.emit("UPDATE_SESSION", { uxtId });
    });
    app.attachStartCallback(() => {
      if (this.assistDemandedRestart) {
        return;
      }
      this.onStart();
      observer &&
        observer.observe(titleNode, {
          subtree: true,
          characterData: true,
          childList: true,
        });
    });
    app.attachStopCallback(() => {
      if (this.assistDemandedRestart) {
        return;
      }
      this.clean();
      observer && observer.disconnect();
    });
    app.attachCommitCallback((messages) => {
      if (this.agentsConnected) {
        const batchSize = messages.length;
        // @ts-ignore No need in statistics messages. TODO proper filter
        if (
          batchSize === 2 &&
          // @ts-ignore No need in statistics messages. TODO proper filter
          messages[0]._id === 0 &&
          // @ts-ignore No need in statistics messages. TODO proper filter
          messages[1]._id === 49
        ) {
          return;
        }
        if (
          batchSize > this.options.compressionMinBatchSize &&
          this.options.compressionEnabled
        ) {
          const toSend: any[] = [];
          if (batchSize > 10000) {
            const middle = Math.floor(batchSize / 2);
            const firstHalf = messages.slice(0, middle);
            const secondHalf = messages.slice(middle);

            toSend.push(firstHalf);
            toSend.push(secondHalf);
          } else {
            toSend.push(messages);
          }
          toSend.forEach((batch) => {
            const str = JSON.stringify(batch);
            const byteArr = new TextEncoder().encode(str);
            gzip(byteArr, { mtime: 0 }, (err, result) => {
              if (err) {
                this.emit("messages", batch);
              } else {
                this.emit("messages_gz", result);
              }
            });
          });
        } else {
          this.emit("messages", messages);
        }
      }
    });
    app.session.attachUpdateCallback((sessInfo) =>
      this.emit("UPDATE_SESSION", sessInfo)
    );
  }

  private emit(ev: string, args?: any): void {
    this.socket &&
      this.socket.emit(ev, {
        meta: { tabId: this.app.getTabId() },
        data: args,
      });
  }

  private get agentsConnected(): boolean {
    return Object.keys(this.agents).length > 0;
  }

  private readonly setCallingState = (newState: CallingState): void => {
    this.callingState = newState;
  };
  private getHost(): string {
    if (this.options.socketHost) {
      return this.options.socketHost;
    }
    if (this.options.serverURL) {
      return new URL(this.options.serverURL).host;
    }
    return this.app.getHost();
  }
  private getBasePrefixUrl(): string {
    if (this.options.serverURL) {
      return new URL(this.options.serverURL).pathname;
    }
    return "";
  }

  private onStart() {
    const app = this.app;
    const sessionId = app.getSessionID();
    // Common for all incoming call requests
    let callUI: CallWindow | null = null;
    let annot: AnnotationCanvas | null = null;
    // TODO: encapsulate
    let callConfirmWindow: ConfirmWindow | null = null;
    let callConfirmAnswer: Promise<boolean> | null = null;
    let callEndCallback: ReturnType<StartEndCallback> | null = null;

    if (!sessionId) {
      return app.debug.error("No session ID");
    }
    const peerID = `${app.getProjectKey()}-${sessionId}-${this.app.getTabId()}`;

    // SocketIO
    const socket = (this.socket = connect(this.getHost(), {
      path: this.getBasePrefixUrl() + "/ws-assist/socket",
      query: {
        peerId: peerID,
        identity: "session",
        tabId: this.app.getTabId(),
        sessionInfo: JSON.stringify({
          uxtId: this.app.getUxtId() ?? undefined,
          pageTitle: document.title,
          active: true,
          assistOnly: this.app.socketMode,
          ...this.app.getSessionInfo(),
        }),
      },
      transports: ['websocket',],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 25000,
      randomizationFactor: 0.5,
    }));
    socket.onAny((...args) => {
      if (args[0] === "messages" || args[0] === "UPDATE_SESSION") {
        return;
      }
      if (args[0] !== "webrtc_call_ice_candidate") {
        app.debug.log("Socket:", ...args);
      }
      socket.on("close", (e) => {
        app.debug.warn("Socket closed:", e);
      });
    });

    const onGrand = (id: string) => {
      if (!callUI) {
        callUI = new CallWindow(app.debug.error, this.options.callUITemplate);
      }
      if (this.remoteControl) {
        callUI?.showRemoteControl(this.remoteControl.releaseControl);
      }
      this.agents[id] = {
        ...this.agents[id],
        onControlReleased: this.options.onRemoteControlStart(
          this.agents[id]?.agentInfo
        ),
      };
      this.emit("control_granted", id);
      annot = new AnnotationCanvas();
      annot.mount();
      return callingAgents.get(id);
    };
    const onRelease = (id?: string | null, isDenied?: boolean) => {
      if (id) {
        const cb = this.agents[id].onControlReleased;
        delete this.agents[id].onControlReleased;
        typeof cb === "function" && cb();
        this.emit("control_rejected", id);
      }
      if (annot != null) {
        annot.remove();
        annot = null;
      }
      callUI?.hideRemoteControl();
      if (this.callingState !== CallingState.True) {
        callUI?.remove();
        callUI = null;
      }
      if (isDenied) {
        const info = id ? this.agents[id]?.agentInfo : {};
        this.options.onRemoteControlDeny?.(info || {});
      }
    };

    this.remoteControl = new RemoteControl(
      this.options,
      onGrand,
      (id, isDenied) => onRelease(id, isDenied),
      (id) => this.emit("control_busy", id)
    );

    const onAcceptRecording = () => {
      socket.emit("recording_accepted");
    };
    const onRejectRecording = (agentData: AgentInfo) => {
      socket.emit("recording_rejected");

      this.options.onRecordingDeny?.(agentData || {});
    };
    const recordingState = new ScreenRecordingState(
      this.options.recordingConfirm
    );

    function processEvent(
      agentId: string,
      event: { meta: { tabId: string }; data?: any },
      callback?: (id: string, data: any) => void
    ) {
      if (app.getTabId() === event.meta.tabId) {
        return callback?.(agentId, event.data);
      }
    }
    if (this.remoteControl !== null) {
      socket.on("request_control", (agentId, dataObj) => {
        processEvent(agentId, dataObj, this.remoteControl?.requestControl);
      });
      socket.on("release_control", (agentId, dataObj) => {
        processEvent(agentId, dataObj, (_, data) =>
          this.remoteControl?.releaseControl(data)
        );
      });
      socket.on("scroll", (id, event) =>
        processEvent(id, event, this.remoteControl?.scroll)
      );
      socket.on("click", (id, event) =>
        processEvent(id, event, this.remoteControl?.click)
      );
      socket.on("move", (id, event) =>
        processEvent(id, event, this.remoteControl?.move)
      );
      socket.on("startDrag", (id, event) =>
        processEvent(id, event, this.remoteControl?.startDrag)
      );
      socket.on("drag", (id, event) =>
        processEvent(id, event, this.remoteControl?.drag)
      );
      socket.on("stopDrag", (id, event) =>
        processEvent(id, event, this.remoteControl?.stopDrag)
      );
      socket.on("focus", (id, event) =>
        processEvent(id, event, (clientID, nodeID) => {
          const el = app.nodes.getNode(nodeID);
          if (el instanceof HTMLElement && this.remoteControl) {
            this.remoteControl.focus(clientID, el);
          }
        })
      );
      socket.on("input", (id, event) =>
        processEvent(id, event, this.remoteControl?.input)
      );
    }

    // TODO: restrict by id
    socket.on("moveAnnotation", (id, event) =>
      processEvent(id, event, (_, d) => annot && annot.move(d))
    );
    socket.on("startAnnotation", (id, event) =>
      processEvent(id, event, (_, d) => annot?.start(d))
    );
    socket.on("stopAnnotation", (id, event) =>
      processEvent(id, event, annot?.stop)
    );

    socket.on(
      "WEBRTC_CONFIG",
      (config: string) => {
        if (config) {
          this.config = JSON.parse(config)
        }
      }
    );

    socket.on("NEW_AGENT", (id: string, info: AgentInfo) => {
      this.cleanCanvasConnections();
      this.agents[id] = {
        onDisconnect: this.options.onAgentConnect?.(info),
        agentInfo: info, // TODO ?
      };
      if (this.app.active()) {
        this.assistDemandedRestart = true;
        this.app.stop();
        this.app.clearBuffers();
        this.app.waitStatus(0).then(() => {
          this.app.allowAppStart();
          setTimeout(() => {
            this.app
              .start()
              .then(() => {
                this.assistDemandedRestart = false;
              })
              .then(() => {
                this.remoteControl?.reconnect([id]);
              })
              .catch((e) => app.debug.error(e));
            // TODO: check if it's needed; basically allowing some time for the app to finish everything before starting again
          }, 100);
        });
      }
    });

    socket.on("AGENTS_INFO_CONNECTED", (agentsInfo: AgentInfo[]) => {
      this.cleanCanvasConnections();
      agentsInfo.forEach((agentInfo) => {
        if (!agentInfo.socketId) return;
        this.agents[agentInfo.socketId] = {
          agentInfo,
          onDisconnect: this.options.onAgentConnect?.(agentInfo),
        };
      });
      if (this.app.active()) {
        this.assistDemandedRestart = true;
        this.app.stop();
        this.app.clearBuffers();
        this.app.waitStatus(0).then(() => {
          this.app.allowAppStart();
          setTimeout(() => {
            this.app
              .start()
              .then(() => {
                this.assistDemandedRestart = false;
              })
              .then(() => {
                this.remoteControl?.reconnect(Object.keys(this.agents));
              })
              .catch((e) => app.debug.error(e));
          }, 100);
        });
      }
    });

    socket.on("AGENT_DISCONNECTED", (id) => {
      this.remoteControl?.releaseControl();

      this.agents[id]?.onDisconnect?.();
      delete this.agents[id];

      Object.values(this.calls).forEach((pc) => pc.close());
      this.calls.clear();

      recordingState.stopAgentRecording(id);
      endAgentCall({ socketId: id });
    });

    socket.on("NO_AGENT", () => {
      Object.values(this.agents).forEach((a) => a.onDisconnect?.());
      this.cleanCanvasConnections();
      this.agents = {};
      if (recordingState.isActive) recordingState.stopRecording();
    });

    socket.on("call_end", (socketId, { data: callId }) => {
      if (!callingAgents.has(socketId)) {
        app.debug.warn("Received call_end from unknown agent", socketId);
        return;
      }

      endAgentCall({ socketId, callId });
    });

    socket.on("_agent_name", (id, info) => {
      if (app.getTabId() !== info.meta.tabId) return;
      const name = info.data;
      callingAgents.set(id, name);
      updateCallerNames();
    });

    socket.on("webrtc_canvas_answer", async (_, data: { answer; id }) => {
      const pc = this.canvasPeers[data.id];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (e) {
          app.debug.error("Error adding ICE candidate", e);
        }
      }
    });

    socket.on(
      "webrtc_canvas_ice_candidate",
      async (_, data: { candidate; id }) => {
        const pc = this.canvasPeers[data.id];
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            app.debug.error("Error adding ICE candidate", e);
          }
        } else {
          this.iceCandidatesBuffer.set(
            data.id,
            this.iceCandidatesBuffer
              .get(data.id)
              ?.concat([data.candidate]) || [data.candidate]
          );
        }
      }
    );

    // If a videofeed arrives, then we show the video in the ui
    socket.on("videofeed", (_, info) => {
      if (app.getTabId() !== info.meta.tabId) return;
      const feedState = info.data;
      callUI?.toggleVideoStream(feedState);
    });

    socket.on("request_recording", (id, info) => {
      if (app.getTabId() !== info.meta.tabId) return;
      const agentData = info.data;
      if (!recordingState.isActive) {
        this.options.onRecordingRequest?.(JSON.parse(agentData));
        recordingState.requestRecording(id, onAcceptRecording, () =>
          onRejectRecording(agentData)
        );
      } else {
        this.emit("recording_busy");
      }
    });
    socket.on("stop_recording", (id, info) => {
      if (app.getTabId() !== info.meta.tabId) return;
      if (recordingState.isActive) {
        recordingState.stopAgentRecording(id);
      }
    });

    socket.on(
      "webrtc_call_offer",
      async (_, data: { from: string; offer: RTCSessionDescriptionInit }) => {
        if (!this.calls.has(data.from)) {
          await handleIncomingCallOffer(data.from, data.offer);
        }
      }
    );

    socket.on(
      "webrtc_call_ice_candidate",
      async (_, data: { from: string; candidate: RTCIceCandidateInit }) => {
        const pc = this.calls[data.from];
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            app.debug.error("Error adding ICE candidate", e);
          }
        } else {
          this.iceCandidatesBuffer.set(
            data.from,
            this.iceCandidatesBuffer
              .get(data.from)
              ?.concat([data.candidate]) || [data.candidate]
          );
        }
      }
    );

    const callingAgents: Map<string, string> = new Map(); // !! uses socket.io ID
    // TODO: merge peerId & socket.io id  (simplest way - send peerId with the name)
    const lStreams: Record<string, LocalStream> = {};

    function updateCallerNames() {
      callUI?.setAssistentName(callingAgents);
    }
    function endAgentCall({
      socketId,
      callId,
    }: {
      socketId: string;
      callId?: string;
    }) {
      callingAgents.delete(socketId);

      if (callingAgents.size === 0) {
        handleCallEnd();
      } else {
        updateCallerNames();
        if (callId) {
          handleCallEndWithAgent(callId);
        }
      }
    }

    const handleCallEndWithAgent = (id: string) => {
      this.calls.get(id)?.close();
      this.calls.delete(id);
    };

    // call end handling
    const handleCallEnd = () => {
      Object.values(this.calls).forEach((pc) => pc.close());
      this.calls.clear();
      Object.values(lStreams).forEach((stream) => {
        stream.stop();
      });
      Object.keys(lStreams).forEach((peerId: string) => {
        delete lStreams[peerId];
      });
      // UI
      closeCallConfirmWindow();
      if (this.remoteControl?.status === RCStatus.Disabled) {
        callUI?.remove();
        annot?.remove();
        callUI = null;
        annot = null;
      } else {
        callUI?.hideControls();
      }

      this.emit("UPDATE_SESSION", { agentIds: [], isCallActive: false });
      this.setCallingState(CallingState.False);
      sessionStorage.removeItem(this.options.session_calling_peer_key);

      callEndCallback?.();
    };
    const closeCallConfirmWindow = () => {
      if (callConfirmWindow) {
        callConfirmWindow.remove();
        callConfirmWindow = null;
        callConfirmAnswer = null;
      }
    };

    const renegotiateConnection = async ({
      pc,
      from,
    }: {
      pc: RTCPeerConnection;
      from: string;
    }) => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.emit("webrtc_call_offer", { from, offer });
      } catch (error) {
        app.debug.error("Error with renegotiation:", error);
      }
    };

    const handleIncomingCallOffer = async (
      from: string,
      offer: RTCSessionDescriptionInit
    ) => {
      app.debug.log("handleIncomingCallOffer", from);
      let confirmAnswer: Promise<boolean>;
      const callingPeerIds = JSON.parse(
        sessionStorage.getItem(this.options.session_calling_peer_key) || "[]"
      );
      // if the caller is already in the list, then we immediately accept the call without ui
      if (
        callingPeerIds.includes(from) ||
        this.callingState === CallingState.True
      ) {
        confirmAnswer = Promise.resolve(true);
      } else {
        // set the state to wait for confirmation
        this.setCallingState(CallingState.Requesting);
        // call the call confirmation window
        confirmAnswer = requestCallConfirm();
        // sound notification of a call
        this.playNotificationSound();

        // after 30 seconds we drop the call
        setTimeout(() => {
          if (this.callingState !== CallingState.Requesting) {
            return;
          }
          initiateCallEnd();
        }, 30000);
      }

      try {
        // waiting for a decision on accepting the challenge
        const agreed = await confirmAnswer;
        // if rejected, then terminate the call
        if (!agreed) {
          initiateCallEnd()
          this.options.onCallDeny?.()
          return
        }

        // create a new RTCPeerConnection with ice server config
        const pc = new RTCPeerConnection({
          iceServers: this.config,
        });
        this.calls.set(from, pc);

        if (!callUI) {
          callUI = new CallWindow(app.debug.error, this.options.callUITemplate)
          callUI.setVideoToggleCallback((args: { enabled: boolean }) =>
            this.emit('videofeed', { streamId: from, enabled: args.enabled })
          );
        }
        // show buttons in the call window
        callUI.showControls(initiateCallEnd)
        if (!annot) {
          annot = new AnnotationCanvas()
          annot.mount()
        }

        // callUI.setLocalStreams(Object.values(lStreams))
        try {
         // if there are no local streams in lStrems then we set
          if (!lStreams[from]) {
            app.debug.log('starting new stream for', from)
            // request a local stream, and set it to lStreams
            lStreams[from] = await RequestLocalStream(pc, renegotiateConnection.bind(null, { pc, from }))
          }
         // we pass the received tracks to Call ui
          callUI.setLocalStreams(Object.values(lStreams))
        } catch (e) {
          app.debug.error('Error requesting local stream', e);
          // if something didn't work out, we terminate the call
          initiateCallEnd();
          this.options.onCallDeny?.();
          return;
        }

        // get all local tracks and add them to RTCPeerConnection
        // When we receive local ice candidates, we emit them via socket
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("webrtc_call_ice_candidate", {
              from,
              candidate: event.candidate,
            });
          }
        };

        // when we get a remote stream, add it to call ui
        pc.ontrack = (event) => {
          const rStream = event.streams[0];
          if (rStream && callUI) {
            callUI.addRemoteStream(rStream, from);
            const onInteraction = () => {
              callUI?.playRemote();
              document.removeEventListener("click", onInteraction);
            };
            document.addEventListener("click", onInteraction);
          }
        };

        // set remote description on incoming request
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        // create a response to the incoming request
        const answer = await pc.createAnswer();
        // set answer as local description
        await pc.setLocalDescription(answer);
        // set the response as local
        socket.emit("webrtc_call_answer", { from, answer });

        this.applyBufferedIceCandidates(from);

        // If the state changes to an error, we terminate the call
        // pc.onconnectionstatechange = () => {
        //   if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        //     initiateCallEnd();
        //   }
        // };

        // Update track when local video changes
        lStreams[from].onVideoTrack((vTrack) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (!sender) {
            app.debug.warn("No video sender found");
            return;
          }
          sender.replaceTrack(vTrack);
        });

        // if the user closed the tab or switched, then we end the call
        document.addEventListener("visibilitychange", () => {
          initiateCallEnd();
        });

        // when everything is set, we change the state to true
        this.setCallingState(CallingState.True);
        if (!callEndCallback) {
          callEndCallback = this.options.onCallStart?.();
        }
        const callingPeerIdsNow = Array.from(this.calls.keys());
        // in session storage we write down everyone with whom the call is established
        sessionStorage.setItem(
          this.options.session_calling_peer_key,
          JSON.stringify(callingPeerIdsNow)
        );
        this.emit("UPDATE_SESSION", {
          agentIds: callingPeerIdsNow,
          isCallActive: true,
        });
      } catch (reason) {
        app.debug.log(reason);
      }
    };

    // Functions for requesting confirmation, ending a call, notifying, etc.
    const requestCallConfirm = () => {
      if (callConfirmAnswer) {
        // If confirmation has already been requested
        return callConfirmAnswer;
      }
      callConfirmWindow = new ConfirmWindow(
        callConfirmDefault(
          this.options.callConfirm || {
            text: this.options.confirmText,
            style: this.options.confirmStyle,
          }
        )
      );
      return (callConfirmAnswer = callConfirmWindow.mount().then((answer) => {
        closeCallConfirmWindow();
        return answer;
      }));
    };

    const initiateCallEnd = () => {
      this.emit("call_end");
      handleCallEnd();
    };

    const startCanvasStream = async (stream: MediaStream, id: number) => {
      for (const agent of Object.values(this.agents)) {
        if (!agent.agentInfo) return;

        const uniqueId = `${agent.agentInfo.peerId}-${agent.agentInfo.id}-canvas-${id}`;

        if (!this.canvasPeers[uniqueId]) {
          this.canvasPeers[uniqueId] = new RTCPeerConnection({
            iceServers: this.config,
          });
          this.setupPeerListeners(uniqueId);
          this.applyBufferedIceCandidates(uniqueId);

          stream.getTracks().forEach((track) => {
            this.canvasPeers[uniqueId]?.addTrack(track, stream);
          });

          // Create SDP offer
          const offer = await this.canvasPeers[uniqueId].createOffer();
          await this.canvasPeers[uniqueId].setLocalDescription(offer);

          // Send offer via signaling server
          socket.emit("webrtc_canvas_offer", { offer, id: uniqueId });
        }
      }
    };

    app.nodes.attachNodeCallback((node) => {
      const id = app.nodes.getID(node);
      if (id && hasTag(node, "canvas") && !app.sanitizer.isHidden(id)) {
        app.debug.log(`Creating stream for canvas ${id}`);
        const canvasHandler = new Canvas(
          node as unknown as HTMLCanvasElement,
          id,
          30,
          (stream: MediaStream) => {
            startCanvasStream(stream, id);
          },
          app.debug.error
        );
        this.canvasMap.set(id, canvasHandler);
        if (this.canvasNodeCheckers.has(id)) {
          clearInterval(this.canvasNodeCheckers.get(id));
        }
        const int = setInterval(() => {
          const isPresent = node.ownerDocument.defaultView && node.isConnected;
          if (!isPresent) {
            this.stopCanvasStream(id);
            clearInterval(int);
          }
        }, 5000);
        this.canvasNodeCheckers.set(id, int);
      }
    });
  }

  private setupPeerListeners(id: string) {
    const peer = this.canvasPeers[id];
    if (!peer) return;
    // ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit("webrtc_canvas_ice_candidate", {
          candidate: event.candidate,
          id,
        });
      }
    };
  }

  private playNotificationSound() {
    if ("Audio" in window) {
      new Audio("https://static.openreplay.com/tracker-assist/notification.mp3")
        .play()
        .catch((e) => {
          this.app.debug.warn(e);
        });
    }
  }

  // clear all data
  private clean() {
    // sometimes means new agent connected, so we keep id for control
    this.remoteControl?.releaseControl(false, true);
    if (this.peerReconnectTimeout) {
      clearTimeout(this.peerReconnectTimeout);
      this.peerReconnectTimeout = null;
    }
    this.cleanCanvasConnections();
    Object.values(this.calls).forEach((pc) => pc.close());
    this.calls.clear();
    if (this.socket) {
      this.socket.disconnect();
      this.app.debug.log("Socket disconnected");
    }
    this.canvasMap.clear();
    this.canvasPeers = {};
    this.canvasNodeCheckers.forEach((int) => clearInterval(int));
    this.canvasNodeCheckers.clear();
    this.iceCandidatesBuffer.clear();
  }

  private cleanCanvasConnections() {
    Object.values(this.canvasPeers).forEach((pc) => pc?.close());
    this.canvasPeers = {};
    this.socket?.emit("webrtc_canvas_restart");
  }

  private stopCanvasStream(id: number) {
    for (const agent of Object.values(this.agents)) {
        if (!agent.agentInfo) return;

        const uniqueId = `${agent.agentInfo.peerId}-${agent.agentInfo.id}-canvas-${id}`;
        this.socket?.emit("webrtc_canvas_stop", { id: uniqueId });

        if (this.canvasPeers[uniqueId]) {
          this.canvasPeers[uniqueId]?.close();
          delete this.canvasPeers[uniqueId];

          this.canvasMap.get(id)?.stop();
          this.canvasMap.delete(id);
          this.canvasNodeCheckers.get(id) && clearInterval(this.canvasNodeCheckers.get(id));
          this.canvasNodeCheckers.delete(id);
        }
      }
  }

  private applyBufferedIceCandidates(from) {
    const buffer = this.iceCandidatesBuffer.get(from);
    if (buffer) {
      buffer.forEach((candidate) => {
        this.calls.get(from)?.addIceCandidate(new RTCIceCandidate(candidate));
      });
      this.iceCandidatesBuffer.delete(from);
    }
  }
}

/** simple peers impl
 * const slPeer = new SLPeer({ initiator: true, stream: stream, })
 *               // slPeer.on('signal', (data: any) => {
 *               //   this.emit('c_signal', { data, id, })
 *               // })
 *               // this.socket?.on('c_signal', (tab: string, data: any) => {
 *               //   console.log(data)
 *               //   slPeer.signal(data)
 *               // })
 *               // slPeer.on('error', console.error)
 *               // this.emit('canvas_stream', { canvasId, })
 * */
