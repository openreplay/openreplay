import { render } from "solid-js/web";
import {
  startLocationRecording,
  stopLocationRecording,
  startClickRecording,
  stopClickRecording,
} from "./eventTrackers";
import ControlsBox from "~/entrypoints/content/ControlsBox";
import { sendMessage, onMessage } from "~/utils/messaging";
import { pageMessages } from "~/utils/pageMessages";
import { getChromeFullVersion } from "./utils";
import "./style.css";
import "~/assets/main.css";

export default defineContentScript({
  matches: ["*://*/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    if (!ctx.isValid) {
      console.error("Spot: context is invalidated on mount");
      return;
    }
    const ui = await createShadowRootUi(ctx, {
      name: "spot-ui",
      inheritStyles: true,
      position: "inline",
      anchor: "body",
      append: "first",
      onMount: (container, s, host) => {
        Object.assign(host.style, { visibility: "visible", display: "block" });
        return render(
          () => (
            <ControlsBox
              getMicStatus={getMicStatus}
              pause={pause}
              resume={resume}
              stop={stop}
              getVideoData={getVideoData}
              onClose={onClose}
              getClockStart={getClockStart}
              muteMic={muteMic}
              unmuteMic={unmuteMic}
              getInitState={() => recState}
              callRecording={countEnd}
              onRestart={onRestart}
              getErrorEvents={getErrorEvents}
              getAudioPerm={getAudioPerm}
            />
          ),
          container,
        );
      },
      onRemove: (unmount) => {
        unmount?.();
      },
    });
    ctx.onInvalidated(() => {
      ui.remove();
    });

    // 0 = no perm, 1 = muted, 2 = unmuted
    type AudioPermState = 0 | 1 | 2;
    let audioPerm: AudioPermState = 0;
    const getAudioPerm = (): AudioPermState => audioPerm;
    let clockStart = 0;
    let recState = "stopped";
    const getClockStart = () => clockStart;

    let data: Record<string, any> | null = null;
    const videoChunks: string[] = [];
    let chunksReady = false;

    const getMicStatus = async (): Promise<boolean> => {
      const r = await sendMessage("ort:getMicStatus").catch(() => ({
        micStatus: false,
      }));
      return r.micStatus;
    };

    const getErrorEvents = async () => {
      return await sendMessage("ort:get-error-events").catch(() => []);
    };

    const getVideoData = async (): Promise<any> => {
      let tries = 0;
      return new Promise((res) => {
        const interval = setInterval(() => {
          if (data && chunksReady) {
            clearInterval(interval);
            videoChunks.length = 0;
            chunksReady = false;
            res(data);
          }
          if (tries > 100) {
            clearInterval(interval);
            res(null);
          }
          tries += 1;
        }, 100);
      });
    };

    const stop = async () => {
      recState = "stopped";
      stopClickRecording();
      stopLocationRecording();
      const result = await sendMessage("ort:stop");
      const maxWait = 1000 * 60;
      const startTime = Date.now();
      if (result.status === "ok") {
        return new Promise((res) => {
          const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed > maxWait) {
              console.error("Spot: timed out waiting for video data");
              clearInterval(interval);
              res(false);
              return;
            }
            if (chunksReady) {
              data = Object.assign({}, result, {
                base64data: videoChunks.concat([]),
              });
              clearInterval(interval);
              res(true);
            }
          }, 100);
        });
      } else {
        console.log(result);
      }
    };

    const pause = () => {
      recState = "paused";
      void sendMessage("ort:pause").catch(() => {});
    };
    const resume = () => {
      recState = "recording";
      void sendMessage("ort:resume").catch(() => {});
    };
    const muteMic = () => {
      void sendMessage("ort:mute-microphone").catch(() => {});
    };
    const unmuteMic = () => {
      void sendMessage("ort:unmute-microphone").catch(() => {});
    };

    const onClose = async (
      save: boolean,
      spotObj?: {
        name?: string;
        comment?: string;
        useHook?: boolean;
        thumbnail?: string;
        crop?: [number, number];
      },
    ) => {
      if (!save || !spotObj) {
        void sendMessage("ort:discard").catch(() => {});
        stopClickRecording();
        stopLocationRecording();
        ui.remove();
        recState = "stopped";
        return;
      }
      const { name, comment, useHook, thumbnail, crop } = spotObj;
      const resolution = `${window.screen.width}x${window.screen.height}`;
      const browserVersion = getChromeFullVersion();
      const spot = {
        name,
        comment,
        useHook,
        preview: thumbnail,
        resolution,
        browserVersion,
        crop,
      };

      try {
        await sendMessage("ort:save-spot", { spot });
        ui.remove();
      } catch (e) {
        console.trace("error saving video", spot, resolution, browserVersion);
        console.error(e);
      }
    };

    const { webapp, injected, notifications, controls } = pageMessages;
    window.addEventListener("message", (event) => {
      if (event.data.type === webapp.ping) {
        window.postMessage({ type: webapp.pong }, "*");
      }
      if (event.data.type === webapp.token) {
        window.postMessage({ type: webapp.logged }, "*");
        const ingest = window.location.origin;
        void sendMessage("ort:login-token", {
          token: event.data.token,
          ingest,
        }).catch(() => {});
      }
      if (event.data.type === webapp.invalidate) {
        void sendMessage("ort:invalidate-token").catch(() => {});
      }
      if (event.data.type === injected.bumpLogs) {
        void sendMessage("ort:bump-logs", { logs: event.data.logs }).catch(
          () => {},
        );
      }
      if (event.data.type === injected.bumpNetwork) {
        void sendMessage("ort:bump-network", { event: event.data.event }).catch(
          () => {},
        );
      }
    });

    let scriptInjected = false;
    function injectScript() {
      if (scriptInjected) return;
      scriptInjected = true;
      const scriptEl = document.createElement("script");
      scriptEl.src = browser.runtime.getURL("/injected.js");
      document.head.appendChild(scriptEl);
    }
    function startConsoleTracking() {
      injectScript();
      setTimeout(() => {
        window.postMessage({ type: injected.consoleStart });
      }, 100);
    }
    function startNetworkTracking() {
      injectScript();
      setTimeout(() => {
        window.postMessage({ type: injected.networkStart });
      }, 100);
    }
    function stopConsoleTracking() {
      window.postMessage({ type: injected.consoleStop });
    }
    function stopNetworkTracking() {
      window.postMessage({ type: injected.networkStop });
    }

    function onRestart() {
      void sendMessage("ort:restart").catch(() => {});
      stopClickRecording();
      stopLocationRecording();
      stopConsoleTracking();
      recState = "stopped";
      ui.remove();
    }

    function mountNotifications() {
      const scriptEl = document.createElement("script");
      scriptEl.src = browser.runtime.getURL("/notifications.js");
      document.head.appendChild(scriptEl);
    }
    mountNotifications();

    let onEndObj: { area?: "tab" | "desktop"; mic?: boolean; audioId?: string } =
      {};
    async function countEnd(): Promise<boolean> {
      const r = await sendMessage("ort:countend", {
        area: onEndObj.area as "tab" | "desktop",
        mic: Boolean(onEndObj.mic),
        audioId: onEndObj.audioId ?? "",
      }).catch(() => false);
      onEndObj = {};
      return r;
    }

    onMessage("content:mount", ({ data: msg }) => {
      if (recState === "count") return;
      recState = "count";
      onEndObj = { area: msg.area, mic: msg.mic, audioId: msg.audioId };
      audioPerm = msg.audioPerm;
      ui.mount();
    });

    onMessage("content:start", ({ data: msg }) => {
      if (recState === "recording") return;
      clockStart = msg.time;
      recState = "recording";
      startClickRecording();
      startLocationRecording();
      if (msg.withConsole) startConsoleTracking();
      if (msg.withNetwork) startNetworkTracking();
      void sendMessage("ort:started").catch(() => {});
      if (msg.shouldMount) ui.mount();
    });

    onMessage("notif:display", ({ data: msg }) => {
      window.postMessage(
        { type: notifications.display, message: msg.message },
        "*",
      );
    });

    onMessage("content:unmount", () => {
      stopClickRecording();
      stopLocationRecording();
      stopConsoleTracking();
      stopNetworkTracking();
      recState = "stopped";
      ui.remove();
    });

    onMessage("content:video-chunk", ({ data: msg }) => {
      videoChunks[msg.index] = msg.data;
      if (msg.total === msg.index + 1) chunksReady = true;
    });

    onMessage("content:spot-saved", ({ data: msg }) => {
      window.postMessage({ type: notifications.copy, url: msg.url }, "*");
    });

    onMessage("content:stop", () => {
      window.postMessage({ type: controls.triggerStop }, "*");
    });
  },
});
