import { render } from "solid-js/web";
import {
  startLocationRecording,
  stopLocationRecording,
  startClickRecording,
  stopClickRecording,
} from "./eventTrackers";
import ControlsBox from "~/entrypoints/content/ControlsBox";
import { messages } from '~/utils/messages';
import { convertBlobToBase64, getChromeFullVersion } from "./utils";
import "./style.css";
import "~/assets/main.css";

export default defineContentScript({
  matches: ["*://*/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    if (!ctx.isValid) {
      console.error("Spot: context is invalidated on mount")
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
    let micResponse: boolean | null = null;
    const getMicStatus = async () => {
      return new Promise((res) => {
        browser.runtime.sendMessage({
          type: messages.content.from.checkMicStatus,
        });
        let int = setInterval(() => {
          if (micResponse !== null) {
            clearInterval(int);
            res(micResponse);
          }
        }, 200);
      });
    };
    // no perm - muted - unmuted
    type AudioPermState = 0 | 1 | 2;
    let audioPerm: AudioPermState = 0;
    const getAudioPerm = (): AudioPermState => audioPerm;
    let clockStart = 0;
    let recState = "stopped";
    const getClockStart = () => {
      return clockStart;
    };
    let data: Record<string, any> | null = null;
    const videoChunks: string[] = [];
    let chunksReady = false;
    let errorsReady = false;
    const errorData: { title: string; time: number }[] = [];

    const getErrorEvents = async (): Promise<any> => {
      let tries = 0;
      browser.runtime.sendMessage({ type: "ort:get-error-events" });
      return new Promise((res) => {
        const interval = setInterval(async () => {
          if (errorsReady) {
            clearInterval(interval);
            errorsReady = false;
            res(errorData);
          }
          // 3 sec timeout
          if (tries > 30) {
            clearInterval(interval);
            res([]);
          }
          tries += 1;
        }, 100);
      });
    };

    const getVideoData = async (): Promise<any> => {
      let tries = 0;
      return new Promise((res) => {
        const interval = setInterval(async () => {
          if (data && chunksReady) {
            clearInterval(interval);
            videoChunks.length = 0;
            chunksReady = false;
            res(data);
          }
          // 10 sec timeout
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
      const result = await browser.runtime.sendMessage({ type: messages.content.from.toStop });
      const maxWait = 1000 * 60;
      const startTime = Date.now();
      if (result.status === "ok") {
        return new Promise((res) => {
          const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTime;
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
      browser.runtime.sendMessage({ type: messages.content.from.pause });
    };

    const resume = () => {
      recState = "recording";
      browser.runtime.sendMessage({ type: messages.content.from.resume });
    };

    const muteMic = () => {
      browser.runtime.sendMessage({ type: messages.content.from.muteMic });
    };

    const unmuteMic = () => {
      browser.runtime.sendMessage({ type: messages.content.from.unmuteMic });
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
        await chrome.runtime.sendMessage({
          type: "ort:discard",
        });
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
        await browser.runtime.sendMessage({
          type: messages.content.from.saveSpotData,
          spot,
        });
        ui.remove();
      } catch (e) {
        console.trace(
          "error saving video",
          spot,
          resolution,
          browserVersion,
        );
        console.error(e);
      }
    };

    window.addEventListener("message", (event) => {
      if (event.data.type === "orspot:ping") {
        window.postMessage({ type: "orspot:pong" }, "*");
      }
      if (event.data.type === "orspot:token") {
        window.postMessage({ type: "orspot:logged" }, "*");
        const ingest = window.location.origin;
        void browser.runtime.sendMessage({
          type: messages.content.from.setLoginToken,
          token: event.data.token,
          ingest
        });
      }
      if (event.data.type === "orspot:invalidate") {
        void browser.runtime.sendMessage({
          type: messages.content.from.invalidateToken,
        });
      }
      if (event.data.type === "ort:bump-logs") {
        void chrome.runtime.sendMessage({
          type:  messages.injected.from.bumpLogs,
          logs: event.data.logs,
        });
      }
      if (event.data.type === "ort:bump-network") {
        void chrome.runtime.sendMessage({
          type: messages.injected.from.bumpNetwork,
          event: event.data.event,
        });
      }
    });

    let injected = false;
    function injectScript() {
      if (injected) return;
      injected = true;
      const scriptEl = document.createElement("script");
      scriptEl.src = browser.runtime.getURL("/injected.js");
      document.head.appendChild(scriptEl);
    }
    function startConsoleTracking() {
      injectScript();
      setTimeout(() => {
        window.postMessage({ type: "injected:c-start" });
      }, 100);
    }
    function startNetworkTracking() {
      injectScript();
      setTimeout(() => {
        window.postMessage({ type: "injected:n-start" });
      }, 100);
    }

    function stopConsoleTracking() {
      window.postMessage({ type: "injected:c-stop" });
    }

    function stopNetworkTracking() {
      window.postMessage({ type: "injected:n-stop" });
    }

    function onRestart() {
      chrome.runtime.sendMessage({
        type: messages.content.from.restart,
      });
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

    function unmountNotifications() {
      window.postMessage({ type: "ornotif:stop" });
    }

    mountNotifications();

    let onEndObj = {};
    async function countEnd(): Promise<boolean> {
      return browser.runtime
        .sendMessage({ ...onEndObj, type: messages.content.from.countEnd })
        .then((r: boolean) => {
          onEndObj = {};
          return r;
        });
    }

    setInterval(() => {
      void browser.runtime.sendMessage({ type: messages.content.from.contentReady });
    }, 250);
    // @ts-ignore false positive
    browser.runtime.onMessage.addListener((message: any, resp) => {
      if (message.type === messages.content.to.mount) {
        if (recState === "count") return;
        recState = "count";
        onEndObj = {
          area: message.area,
          mic: message.mic,
          audioId: message.audioId,
        };
        audioPerm = message.audioPerm;
        ui.mount();
      }
      if (message.type === messages.content.to.start) {
        if (recState === "recording") return;
        clockStart = message.time;
        recState = "recording";
        micResponse = null;
        startClickRecording();
        startLocationRecording();
        if (message.withConsole) {
          startConsoleTracking();
        }
        if (message.withNetwork) {
          startNetworkTracking();
        }
        browser.runtime.sendMessage({ type: messages.content.from.started });
        if (message.shouldMount) {
          ui.mount();
        }
        return "pong";
      }
      if (message.type === messages.content.to.notification) {
        window.postMessage(
          {
            type: "ornotif:display",
            message: message.message,
          },
          "*",
        );
      }
      if (message.type === messages.content.to.unmount) {
        stopClickRecording();
        stopLocationRecording();
        stopConsoleTracking();
        stopNetworkTracking();
        recState = "stopped";
        ui.remove();
        return "unmounted";
      }
      if (message.type === messages.content.to.videoChunk) {
        videoChunks[message.index] = message.data;
        if (message.total === message.index + 1) {
          chunksReady = true;
        }
      }
      if (message.type === messages.content.to.spotSaved) {
        window.postMessage({ type: "ornotif:copy", url: message.url });
      }
      if (message.type === messages.content.to.stop) {
        window.postMessage({ type: "content:trigger-stop" }, "*");
      }
      if (message.type === messages.content.to.micStatus) {
        micResponse = message.micStatus;
      }
      if (message.type === messages.content.to.updateErrorEvents) {
        errorsReady = true;
        errorData.push(...message.errorData);
      }
    });
  },
});
