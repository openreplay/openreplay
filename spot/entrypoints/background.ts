import { WebRequest } from "webextension-polyfill";
export default defineBackground(() => {
  const CHECK_INT = 60 * 1000;
  const PING_INT = 30 * 1000
  const messages = {
    popup: {
      from: {
        updateSettings: "ort:settings",
        start: "popup:start",
      },
      to: {
        micStatus: "popup:mic-status",
        stopped: "popup:stopped",
        started: "popup:started",
        noLogin: "popup:no-login",
      },
      stop: "popup:stop",
      checkStatus: "popup:check-status",
      loginExist: "popup:login",
      getAudioPerms: "popup:get-audio-perm",
    },
    content: {
      from: {
        bumpVitals: "ort:bump-vitals",
        bumpClicks: "ort:bump-clicks",
        bumpLocation: "ort:bump-location",
        discard: "ort:discard",
        checkLogin: "ort:get-login",
        checkRecStatus: "ort:check-status",
        checkMicStatus: "ort:getMicStatus",
        setLoginToken: "ort:login-token",
        invalidateToken: "ort:invalidate-token",
        saveSpotData: "ort:save-spot",
        saveSpotVidChunk: "ort:save-spot-part",
        countEnd: "ort:countend",
        contentReady: "ort:content-ready",
        checkNewTab: "ort:check-new-tab",
        started: "ort:started",
        stopped: "ort:stopped",
        restart: "ort:restart",
        getErrorEvents: "ort:get-error-events",
      },
      to: {
        setJWT: "content:set-jwt",
        micStatus: "content:mic-status",
        unmount: "content:unmount",
        notification: "notif:display",
        updateErrorEvents: "content:error-events"
      },
    },
    injected: {
      from: {
        bumpLogs: "ort:bump-logs",
      },
    },
    offscreen: {
      to: {
        checkRecStatus: "offscr:check-status",
        startRecording: "offscr:start-recording",
      },
    },
  };

  interface SpotObj {
    name: string;
    comment: string;
    useHook: string;
    preview: string;
    base64data: string;
    duration: number;
    network: SpotNetworkRequest[];
    logs: { level: string; msg: string; time: number }[];
    clicks: { time: number; label: string }[];
    crop: [number, number] | null;
    locations: {
      time: number;
      location: string;
      navTiming: {
        fcpTime: number;
        visuallyComplete: number;
        timeToInteractive: number;
      };
    }[];
    vitals: {
      name: "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";
      value: number;
    }[];
    startTs: number;
    browserName: string;
    browserVersion: string;
    platform: string;
    resolution: string;
  }

  const REC_STATE = {
    recording: "recording",
    paused: "paused",
    stopped: "stopped",
  };

  const defaultSpotObj = {
    name: "",
    comment: "",
    useHook: "",
    preview: "",
    base64data: "",
    duration: 100,
    network: [],
    logs: [],
    clicks: [],
    locations: [],
    vitals: [],
    startTs: 0,
    browserName: "chrome",
    browserVersion: "",
    platform: "",
    resolution: "",
    crop: null,
  };
  let contentArmy: Record<any, boolean> = {};
  let micStatus = "off";
  let finalVideoBase64 = "";
  let finalReady = false;
  let finalSpotObj: SpotObj = defaultSpotObj;
  let onStop: (() => void) | null = null;
  let settings = {
    openInNewTab: true,
    consoleLogs: true,
    networkLogs: true,
    ingestPoint: "https://foss.openreplay.com",
  };
  let recordingState = {
    activeTabId: null,
    area: null,
    recording: REC_STATE.stopped,
    audioPerm: 0,
  } as Record<string, any>;
  let jwtToken = "";

  function setJWTToken(token: string) {
    jwtToken = token;
    if (token && token.length) {
      chrome.storage.local.set({ jwtToken: token });
      void browser.runtime.sendMessage({
        type: messages.popup.loginExist,
      });
    } else {
      chrome.storage.local.remove("jwtToken");
      void browser.runtime.sendMessage({
        type: messages.popup.to.noLogin,
      });
    }
  }

  function safeApiUrl(url: string) {
    let str = url;
    if (str.endsWith("/")) {
      str = str.slice(0, -1);
    }
    if (str.includes("app.openreplay.com")) {
      str = "https://api.openreplay.com";
    }
    return str;
  }

  let slackChannels: { name: string; webhookId: number }[] = [];
  const refreshToken = async (ingest: string) => {
    if (!isTokenExpired(jwtToken) || !jwtToken) {
      if (refreshInt) {
        clearInterval(refreshInt);
      }
      return true;
    }
    const resp = await fetch(`${ingest}/spot/refresh`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });
    if (!resp.ok) {
      chrome.storage.local.remove("jwtToken");
      setJWTToken("");
      void browser.runtime.sendMessage({
        type: messages.popup.to.noLogin,
      });
      return false;
    }
    const data = await resp.json();
    const refreshedJwt = data.jwt;
    setJWTToken(refreshedJwt);
    return true;
  };

  const fetchSlackChannels = async (token: string, ingest: string) => {
    await refreshToken(ingest);
    const resp = await fetch(`${ingest}/spot/integrations/slack/channels`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (resp.ok) {
      const { data } = await resp.json();
      slackChannels = data.map((channel: Record<string, any>) => ({
        name: channel.name,
        webhookId: channel.webhookId,
      }));
    }
  };
  let refreshInt: any;
  let pingInt: any;
  chrome.storage.local.get(["jwtToken", "settings"]).then(async (data: any) => {
    if (!data.settings) {
      chrome.storage.local.set({ settings });
      return;
    }
    const newObj = Object.assign(settings, data.settings);
    settings = newObj;

    if (!data.jwtToken) {
      console.error("No JWT token found in storage");
      void browser.runtime.sendMessage({
        type: messages.popup.to.noLogin,
      });
      return;
    }

    const url = safeApiUrl(`${data.settings.ingestPoint}/api`);
    const ok = await refreshToken(url);
    if (ok) {
      fetchSlackChannels(data.jwtToken, url).catch((e) => {
        console.error(e);
        void refreshToken(url);
      });

      if (!refreshInt) {
        refreshInt = setInterval(() => {
          void refreshToken(url);
        }, CHECK_INT);
      }

      if (!pingInt) {
        pingInt = setInterval(() => {
          void pingJWT(url);
        }, PING_INT)
      }
    }
  });

  async function pingJWT(refreshUrl: string): Promise<void> {
    if (!jwtToken) {
      if (pingInt) {
        clearInterval(pingInt);
      }
      return;
    }
    const url = safeApiUrl(`${settings.ingestPoint}/spot/v1/ping`);
    try {
      const r = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      })
      if (!r.ok) {
        void refreshToken(refreshUrl)
      }
    } catch (e) {
      void refreshToken(refreshUrl)
    }
  }

  let lastReq: Record<string, any> | null = null;
  browser.runtime.onMessage.addListener((request, sender, respond) => {
    if (request.type === messages.content.from.contentReady) {
      if (sender?.tab?.id) {
        contentArmy[sender.tab.id] = true;
      }
    }
    if (request.type === messages.popup.from.start) {
      lastReq = request;
      finalSpotObj.logs = [];
      finalSpotObj.clicks = [];
      finalSpotObj.locations = [];
      finalSpotObj.vitals = [];
      finalSpotObj.network = [];
      finalSpotObj = defaultSpotObj;
      recordingState = {
        activeTabId: null,
        area: null,
        recording: REC_STATE.stopped,
        audioPerm: request.permissions ? request.mic ? 2 : 1 : 0,
      };
      if (request.area === "tab") {
        browser.tabs
          .query({
            active: true,
            currentWindow: true,
          })
          .then((tabs) => {
            const active = tabs[0];
            if (active) {
              recordingState.activeTabId = active.id;
            }
            void sendToActiveTab({
              type: "content:mount",
              area: request.area,
              mic: request.mic,
              audioId: request.selectedAudioDevice,
              audioPerm: request.permissions ? request.mic ? 2 : 1 : 0,
            });
          });
      } else {
        void sendToActiveTab({
          type: "content:mount",
          area: request.area,
          mic: request.mic,
          audioId: request.selectedAudioDevice,
          audioPerm: request.permissions ? request.mic ? 2 : 1 : 0,
        });
      }
    }
    if (request.type === messages.content.from.countEnd) {
      if (!jwtToken) {
        chrome.storage.local.get("jwtToken", (data: any) => {
          if (!data.jwtToken) {
            console.error("No JWT token found");
            void browser.runtime.sendMessage({
              type: messages.popup.to.noLogin,
            });
            return;
          }
          setJWTToken(data.jwtToken);
        });
      }
      finalVideoBase64 = "";
      const recArea = request.area;
      finalSpotObj.startTs = Date.now();
      if (recArea === "tab") {
        function signalTabRecording() {
          recordingState = {
            activeTabId: recordingState.activeTabId,
            area: "tab",
            recording: REC_STATE.recording,
          };
          const microphone = request.mic;
          micStatus = microphone ? "on" : "off";
          void startRecording(
            recArea,
            microphone,
            request.audioId,
            slackChannels,
            recordingState.activeTabId,
            settings.networkLogs,
            settings.consoleLogs,
            () => recordingState.recording,
          );
          respond(true);
        }
        if (!recordingState.activeTabId) {
          browser.tabs
            .query({ active: true, currentWindow: true })
            .then((t) => {
              recordingState.activeTabId = t[0].id;
              signalTabRecording();
            });
        }
        if (recordingState.activeTabId) {
          new Promise((r) => {
            signalTabRecording();
            r(true);
          });
        }
        return true;
      } else {
        const microphone = request.mic;
        micStatus = microphone ? "on" : "off";
        recordingState = {
          activeTabId: null,
          area: "desktop",
          recording: REC_STATE.recording,
        };
        startRecording(
          recArea,
          microphone,
          request.audioId,
          slackChannels,
          undefined,
          settings.networkLogs,
          settings.consoleLogs,
          () => recordingState.recording,
          (hook) => {
            onStop = hook;
          },
        ).then(() => {
          respond(true);
        });
        return true;
      }
    }
    if (request.type === messages.popup.checkStatus) {
      if (jwtToken) {
        void browser.runtime.sendMessage({ type: messages.popup.loginExist });
        if (recordingState.recording !== REC_STATE.stopped) {
          void browser.runtime.sendMessage({
            type: messages.popup.to.started,
          });
        }
      } else {
        void browser.runtime.sendMessage({ type: messages.popup.to.noLogin });
      }
    }
    if (request.type === messages.popup.stop) {
      if (onStop) {
        onStop();
      }
      void sendToActiveTab({
        type: "content:stop",
      });
    }
    if (request.type === messages.content.from.checkNewTab) {
      chrome.storage.local.get("settings", (data: any) => {
        respond(Boolean(data.settings.openInNewTab));
      });

      return true;
    }
    if (request.type === messages.content.from.started) {
      void browser.runtime.sendMessage({
        type: messages.popup.to.started,
      });
    }
    if (request.type === messages.content.from.stopped) {
      void browser.runtime.sendMessage({
        type: messages.popup.to.stopped,
      });
    }
    if (request.type === messages.popup.getAudioPerms) {
      void browser.tabs.create({
        url: browser.runtime.getURL("/audio.html"),
        active: true,
      });
    }
    if (request.type === "audio:audio-perm") {
      void browser.runtime.sendMessage({
        type: "popup:audio-perm",
      });
    }
    if (request.type === messages.content.from.setLoginToken) {
      setJWTToken(request.token);
      chrome.storage.local.get("settings", (data: any) => {
        if (!data.settings) {
          chrome.storage.local.set({ settings });
          return;
        }
        const url = safeApiUrl(`${data.settings.ingestPoint}/api`);
        if (!refreshInt)  {
          refreshInt = setInterval(() => {
            void refreshToken(url);
          }, CHECK_INT);
        }
        if (!pingInt) {
          pingInt = setInterval(() => {
            void pingJWT(url);
          }, PING_INT)
        }
      });
    }
    if (request.type === messages.content.from.invalidateToken) {
      if (refreshInt) {
        clearInterval(refreshInt);
      }
      if (pingInt) {
        clearInterval(pingInt)
      }
      setJWTToken("");
    }
    if (request.type === messages.content.from.checkMicStatus) {
      void sendToActiveTab({
        type: messages.content.to.micStatus,
        micStatus: micStatus === "on",
      });
    }
    if (request.type === messages.popup.from.updateSettings) {
      const updatedObject = Object.assign(settings, request.settings);
      settings = updatedObject;
      chrome.storage.local.set({ settings: updatedObject });
    }
    if (request.type === messages.content.from.checkRecStatus) {
      const id = request.tabId;
      if (recordingState.area === "tab" && id !== recordingState.activeTabId) {
        respond({ status: false });
      } else {
        browser.runtime
          .sendMessage({
            type: messages.offscreen.to.checkRecStatus,
            target: "offscreen",
          })
          .then((r) => {
            respond({ ...r, state: recordingState.recording });
          });
      }
      return true;
    }
    if (request.type === messages.content.from.checkLogin) {
      if (jwtToken) {
        void sendToActiveTab({
          type: messages.content.to.setJWT,
          jwtToken,
        });
      }
    }
    if (request.type === messages.injected.from.bumpLogs) {
      finalSpotObj.logs.push(...request.logs);
      console.log("log bump", finalSpotObj.logs);
      return "pong";
    }
    if (request.type === messages.content.from.bumpClicks) {
      finalSpotObj.clicks.push(...request.clicks);
      return "pong";
    }
    if (request.type === messages.content.from.bumpLocation) {
      finalSpotObj.locations.push(request.location);
      return "pong";
    }
    if (request.type === messages.content.from.bumpVitals) {
      finalSpotObj.vitals.push(request.vitals);
      return "pong";
    }
    if (request.type === messages.content.from.discard) {
      finalSpotObj = {
        name: "",
        comment: "",
        useHook: "",
        preview: "",
        base64data: "",
        duration: 100,
        network: [],
        logs: [],
        clicks: [],
        locations: [],
        vitals: [],
        startTs: 0,
        browserName: "chrome",
        browserVersion: "",
        platform: "",
        resolution: "",
        crop: null,
      };
      finalVideoBase64 = "";
      finalReady = false;
      recordingState = {
        activeTabId: null,
        area: null,
        recording: REC_STATE.stopped,
      };
    }
    if (request.type === messages.content.from.restart) {
      void browser.runtime.sendMessage({
        type: "offscr:stop-discard",
        target: "offscreen",
      });
      finalVideoBase64 = "";
      finalReady = false;
      finalSpotObj = defaultSpotObj;
      recordingState = {
        activeTabId: null,
        area: null,
        recording: REC_STATE.stopped,
        audioPerm: lastReq.permissions,
      };
      void sendToActiveTab({
        type: "content:mount",
        area: lastReq.area,
        mic: lastReq.mic,
        audioId: lastReq.selectedAudioDevice,
        audioPerm: lastReq.permissions,
      });
    }
    if (request.type === messages.content.from.getErrorEvents) {
      const logs = finalSpotObj.logs.filter(
        (log) => log.level === "error",
      ).map(l => ({ title: 'JS Error', time: (l.time - finalSpotObj.startTs)/1000 }))
      const network = finalSpotObj.network.filter(
        (net) => net.statusCode >= 400 || net.error,
      ).map(n => ({ title: 'Network Error', time: (n.time - finalSpotObj.startTs)/1000 }))

      const errorData = [...logs, ...network]
        .sort((a, b) => a.time - b.time)

      void sendToActiveTab({
        type: messages.content.to.updateErrorEvents,
        errorData,
      })
    }
    if (request.type === "ort:stop") {
      browser.runtime
        .sendMessage({
          type: "offscr:stop-recording",
          target: "offscreen",
        })
        .then((r) => {
          if (r.status === "full") {
            finalSpotObj.duration = r.duration;
            respond(r);
          } else {
            respond({ status: r.status });
          }
        });
      onStop?.();
      recordingState.recording = REC_STATE.stopped;

      return true;
    }
    if (request.type === "offscr:video-data-chunk") {
      finalSpotObj.duration = request.duration;
      sendToActiveTab({
        type: "content:video-chunk",
        data: request.data,
        index: request.index,
        total: request.total,
      });
    }
    if (request.type === "ort:pause") {
      void sendToOffscreen({
        type: "offscr:pause-recording",
        target: "offscreen",
      });
      recordingState.recording = REC_STATE.paused;
      return "pong";
    }
    if (request.type === "ort:resume") {
      void sendToOffscreen({
        type: "offscr:resume-recording",
        target: "offscreen",
      });
      recordingState.recording = REC_STATE.recording;
      return "pong";
    }
    if (request.type === "ort:mute-microphone") {
      micStatus = "off";
      void sendToOffscreen({
        type: "offscr:mute-microphone",
        target: "offscreen",
      });
      void sendToActiveTab({
        type: "content:mic-status",
        micStatus: micStatus === "on",
      });
      chrome.runtime.sendMessage({
        type: messages.popup.to.micStatus,
        status: false,
      });
    }
    if (request.type === "ort:unmute-microphone") {
      micStatus = "on";
      void sendToOffscreen({
        type: "offscr:unmute-microphone",
        target: "offscreen",
      });
      void sendToActiveTab({
        type: "content:mic-status",
        micStatus: micStatus === "on",
      });
      chrome.runtime.sendMessage({
        type: messages.popup.to.micStatus,
        status: true,
      });
    }
    if (request.type === messages.content.from.saveSpotData) {
      stopTrackingNetwork();
      const finalNetwork: SpotNetworkRequest[] = [];
      const tab =
        recordingState.area === "tab" ? recordingState.activeTabId : undefined;
      let lastIn = 0;
      try {
        rawRequests.forEach((r, i) => {
          lastIn = i;
          const spotNetworkRequest = createSpotNetworkRequest(r, tab);
          if (spotNetworkRequest) {
            finalNetwork.push(spotNetworkRequest);
          }
        });
      } catch (e) {
        console.error("cant parse network", e, rawRequests[lastIn]);
      }
      Object.assign(finalSpotObj, request.spot, {
        network: finalNetwork,
      });
      return "pong";
    }
    if (request.type === messages.content.from.saveSpotVidChunk) {
      finalVideoBase64 += request.part;
      finalReady = request.index === request.total - 1;
      const getPlatformData = async () => {
        const vendor = await chrome.runtime.getPlatformInfo();
        const platform = `${vendor.os} ${vendor.arch}`;
        return { platform };
      };
      if (finalReady) {
        const duration = finalSpotObj.crop
          ? finalSpotObj.crop[1] - finalSpotObj.crop[0]
          : finalSpotObj.duration;
        const dataObj = {
          name: finalSpotObj.name,
          comment: finalSpotObj.comment,
          preview: finalSpotObj.preview,
          // duration: finalSpotObj.duration,
          duration: duration,
          crop: finalSpotObj.crop,
          vitals: finalSpotObj.vitals,
        };
        const videoData = finalVideoBase64;

        getPlatformData().then(({ platform }) => {
          const cropped =
            finalSpotObj.crop &&
            finalSpotObj.crop[0] + finalSpotObj.crop[1] > 0;
          const logs = [];
          const network = [];
          const locations = [];
          if (!cropped) {
            logs.push(...finalSpotObj.logs);
            network.push(...finalSpotObj.network);
            locations.push(...finalSpotObj.locations);
          } else {
            const start =
              finalSpotObj.startTs +
              (finalSpotObj.crop ? finalSpotObj.crop[0] : 0);
            const end =
              finalSpotObj.startTs +
              (finalSpotObj.crop ? finalSpotObj.crop[1] : 0);
            logs.push(
              ...finalSpotObj.logs.filter(
                (log) => log.time >= start && log.time <= end,
              ),
            );
            network.push(
              ...finalSpotObj.network.filter(
                (net) => net.time >= start && net.time <= end,
              ),
            );
            locations.push(
              ...finalSpotObj.locations.filter(
                (loc) => loc.time >= start && loc.time <= end,
              ),
            );
          }
          const mobData = Object.assign(
            {},
            {
              clicks: finalSpotObj.clicks,
              logs,
              network,
              locations,
              startTs: finalSpotObj.startTs,
              resolution: finalSpotObj.resolution,
              browserVersion: finalSpotObj.browserVersion,
              platform,
            },
          );

          const ingestUrl = safeApiUrl(settings.ingestPoint);

          const dataUrl = `${ingestUrl}/spot/v1/spots`;
          refreshToken(ingestUrl).then((r) => {
            if (!r) {
              void sendToActiveTab({
                type: messages.content.to.notification,
                message: `Error saving Spot: couldn't get active login`,
              });
            }
            fetch(dataUrl, {
              method: "POST",
              body: JSON.stringify(dataObj),
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwtToken}`,
              },
            })
              .then((r) => {
                if (r.ok) {
                  return r.json();
                } else {
                  if (r.status === 401) {
                    throw new Error(
                      "Not authorized or no permissions to create Spot",
                    );
                  }
                }
              })
              .then(async (resp) => {
                recordingState = {
                  activeTabId: null,
                  area: null,
                  recording: REC_STATE.stopped,
                };
                // id of spot, mobURL - for events, videoURL - for video
                if (!resp || !resp.id) {
                  return sendToActiveTab({
                    type: messages.content.to.notification,
                    message: "Couldn't save Spot",
                  });
                }
                const { id, mobURL, videoURL } = resp;
                const link = settings.ingestPoint.includes("api.openreplay.com")
                  ? "https://app.openreplay.com"
                  : settings.ingestPoint;
                chrome.tabs.create({
                  url: `${link}/view-spot/${id}`,
                  active: settings.openInNewTab,
                });
                void sendToActiveTab({
                  type: "content:spot-saved",
                  url: `${link}/view-spot/${id}`,
                });
                const blob = base64ToBlob(videoData);

                const mPromise = fetch(mobURL, {
                  method: "PUT",
                  body: JSON.stringify(mobData),
                  headers: {
                    "Content-Type": "application/json",
                  },
                });
                const vPromise = fetch(videoURL, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "video/webm",
                  },
                  body: blob,
                });
                Promise.all([mPromise, vPromise])
                  .then(async (r) => {
                    const uploadedUrl = `${safeApiUrl(settings.ingestPoint)}/spot/v1/spots/${id}/uploaded`;
                    void fetch(uploadedUrl, {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${jwtToken}`,
                      },
                    });
                  })
                  .catch(console.error);
              })
              .catch((e) => {
                console.error(e);
                void sendToActiveTab({
                  type: messages.content.to.notification,
                  message: `Error saving Spot: ${e.message}`,
                });
              })
              .finally(() => {
                finalSpotObj = defaultSpotObj;
              });
          })
            .catch(e => {
              void sendToActiveTab({
                type: messages.content.to.notification,
                message: `Error saving Spot: ${e.message}`,
              });
            })
        });
      }

      return "pong";
    }
  });

  void browser.runtime.setUninstallURL("https://forms.gle/sMo8da2AvrPg5o7YA");
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    // Also fired on update and browser_update
    if (reason !== "install") return;

    await browser.tabs.create({
      url: "https://www.openreplay.com/spot/welcome?ref=extension",
      active: true,
    });
  });
  void initializeOffscreenDocument();

  type TrackedRequest =
    | WebRequest.OnBeforeRequestDetailsType
    | WebRequest.OnBeforeSendHeadersDetailsType
    | WebRequest.OnCompletedDetailsType
    | WebRequest.OnErrorOccurredDetailsType;

  interface SpotNetworkRequest {
    encodedBodySize: number;
    responseBodySize: number;
    duration: number;
    method: TrackedRequest["method"];
    type: string;
    time: TrackedRequest["timeStamp"];
    statusCode: number;
    error?: string;
    url: TrackedRequest["url"];
    fromCache: boolean;
    body: string;
    requestHeaders: Record<string, string>;
    responseHeaders: Record<string, string>;
  }
  const rawRequests: (TrackedRequest & {
    startTs: number;
    duration: number;
  })[] = [];
  const processedRequests: SpotNetworkRequest[] = [];
  function parseBody(body: any): string {
    if (body instanceof ArrayBuffer) {
      return "Binary ArrayBuffer omitted";
    }
    if (body instanceof Blob) {
      return "Binary Blob omitted";
    }
    try {
      return JSON.stringify(body);
    } catch (e) {
      return "Failed to parse request body";
    }
  }
  function filterHeaders(headers: Record<string, string>) {
    const filteredHeaders: Record<string, string> = {};
    const privateHs = [
      "x-api-key",
      "www-authenticate",
      "x-csrf-token",
      "x-requested-with",
      "x-forwarded-for",
      "x-real-ip",
      "cookie",
      "authorization",
      "auth",
      "proxy-authorization",
      "set-cookie",
    ];
    if (Array.isArray(headers)) {
      headers.forEach(({ name, value }) => {
        if (privateHs.includes(name.toLowerCase())) {
          return;
        } else {
          filteredHeaders[name] = value;
        }
      });
    } else {
      for (const [key, value] of Object.entries(headers)) {
        if (!privateHs.includes(key.toLowerCase())) {
          filteredHeaders[key] = value;
        }
      }
    }
    return filteredHeaders;
  }
  function createSpotNetworkRequest(
    trackedRequest: TrackedRequest,
    trackedTab?: number,
  ) {
    if (trackedRequest.tabId === -1) {
      return;
    }
    if (trackedTab && trackedTab !== trackedRequest.tabId) {
      return;
    }
    if (
      ["ping", "beacon", "image", "script", "font"].includes(
        trackedRequest.type,
      )
    ) {
      if (!trackedRequest.statusCode || trackedRequest.statusCode < 400) {
        return;
      }
    }
    const type = ["stylesheet", "script", "image", "media", "font"].includes(
      trackedRequest.type,
    )
      ? "resource"
      : trackedRequest.type;

    const requestHeaders = trackedRequest.requestHeaders
      ? filterHeaders(trackedRequest.requestHeaders)
      : {};
    const responseHeaders = trackedRequest.responseHeaders
      ? filterHeaders(trackedRequest.responseHeaders)
      : {};

    const reqSize = trackedRequest.reqBody
      ? trackedRequest.requestSize || trackedRequest.reqBody.length
      : 0;

    const status = getRequestStatus(trackedRequest);
    const request: SpotNetworkRequest = {
      method: trackedRequest.method,
      type,
      body: trackedRequest.reqBody,
      requestHeaders,
      responseHeaders,
      time: trackedRequest.timeStamp,
      statusCode: status,
      error: trackedRequest.error,
      url: trackedRequest.url,
      fromCache: trackedRequest.fromCache || false,
      encodedBodySize: reqSize,
      responseBodySize: trackedRequest.responseSize,
      duration: trackedRequest.duration,
    };

    return request;
  }

  function modifyOnSpot(request: TrackedRequest) {
    const id = request.requestId;
    const index = rawRequests.findIndex((r) => r.requestId === id);
    const ts = Date.now();
    const start = rawRequests[index]?.startTs ?? ts;
    rawRequests[index] = {
      ...rawRequests[index],
      ...request,
      duration: ts - start,
    };
  }

  const trackOnBefore = (
    details: WebRequest.OnBeforeRequestDetailsType & { reqBody: string },
  ) => {
    if (details.method === "POST" && details.requestBody) {
      const requestBody = details.requestBody;
      if (requestBody.formData) {
        details.reqBody = JSON.stringify(requestBody.formData);
      } else if (requestBody.raw) {
        const raw = requestBody.raw[0]?.bytes;
        if (raw) {
          details.reqBody = new TextDecoder("utf-8").decode(raw);
        }
      }
    }
    rawRequests.push({ ...details, startTs: Date.now(), duration: 0 });
  };
  const trackOnCompleted = (details: WebRequest.OnCompletedDetailsType) => {
    modifyOnSpot(details);
  };
  const trackOnHeaders = (
    details: WebRequest.OnBeforeSendHeadersDetailsType,
  ) => {
    modifyOnSpot(details);
  };
  const trackOnError = (details: WebRequest.OnErrorOccurredDetailsType) => {
    modifyOnSpot(details);
  };
  function startTrackingNetwork() {
    rawRequests.length = 0;
    processedRequests.length = 0;
    browser.webRequest.onBeforeRequest.addListener(
      // @ts-ignore
      trackOnBefore,
      { urls: ["<all_urls>"] },
      ["requestBody"],
    );
    browser.webRequest.onBeforeSendHeaders.addListener(
      trackOnHeaders,
      { urls: ["<all_urls>"] },
      ["requestHeaders"],
    );
    browser.webRequest.onCompleted.addListener(
      trackOnCompleted,
      {
        urls: ["<all_urls>"],
      },
      ["responseHeaders"],
    );
    browser.webRequest.onErrorOccurred.addListener(
      trackOnError,
      {
        urls: ["<all_urls>"],
      },
      ["extraHeaders"],
    );
  }

  function stopTrackingNetwork() {
    browser.webRequest.onBeforeRequest.removeListener(trackOnBefore);
    browser.webRequest.onCompleted.removeListener(trackOnCompleted);
    browser.webRequest.onErrorOccurred.removeListener(trackOnError);
  }

  async function initializeOffscreenDocument() {
    const existingContexts = await browser.runtime.getContexts({});
    let recording = false;

    const offscreenDocument = existingContexts.find(
      (c: { contextType: string }) => c.contextType === "OFFSCREEN_DOCUMENT",
    );

    if (!offscreenDocument) {
      await browser.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["DISPLAY_MEDIA", "USER_MEDIA", "BLOBS"],
        justification: "Recording from chrome.tabCapture API",
      });
    } else {
      recording = offscreenDocument.documentUrl.endsWith("#recording");
    }
    return recording;
  }
  async function sendToActiveTab(message: {
    type: string;
    data?: any;
    activeTabId?: number;
    [key: string]: any;
  }) {
    let activeTabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!activeTabs.length) {
      activeTabs = await browser.tabs.query({});
    }
    let activeTab = activeTabs[0];
    const sendTo = message.activeTabId || activeTab.id!;
    if (!contentArmy[sendTo]) {
      let tries = 0;
      const exist = await new Promise((res) => {
        const interval = setInterval(() => {
          if (contentArmy[sendTo] || tries < 500) {
            clearInterval(interval);
            res(tries < 500);
          }
        }, 100);
      });
      if (!exist) throw new Error("Can't find required tab");
    }
    try {
      void browser.tabs.sendMessage(sendTo, message);
    } catch (e) {
      console.error("Sending to active tab", e, message);
    }
  }

  async function sendToOffscreen(message: {
    type: string;
    target: "offscreen";
    data?: any;
    [key: string]: any;
  }) {
    try {
      const resp = await browser.runtime.sendMessage(message);
      return resp;
    } catch (e) {
      console.error("Sending to offscreen", e);
    }
  }

  function base64ToBlob(base64: string, mimeType = "video/webm") {
    const binaryString = atob(base64.split(",")[1]);
    const byteNumbers = new Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      byteNumbers[i] = binaryString.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  async function startRecording(
    area: "tab" | "desktop",
    microphone: boolean,
    audioId: string,
    slackChannels: { name: string; webhookId: number }[],
    activeTabId: number | undefined,
    withNetwork: boolean,
    withConsole: boolean,
    getRecState: () => string,
    setOnStop?: (hook: any) => void,
  ) {
    let activeTabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!activeTabs.length) {
      activeTabs = await browser.tabs.query({});
    }
    let activeTab = activeTabs[0];
    const usedTab = activeTabId ?? activeTab.id;
    try {
      const streamId = await browser.tabCapture.getMediaStreamId({
        targetTabId: usedTab,
      });
      const resp = await sendToOffscreen({
        type: messages.offscreen.to.startRecording,
        target: "offscreen",
        data: streamId,
        area,
        microphone,
        audioId,
      });
      if (!resp.success) {
        recordingState = {
          activeTabId: null,
          area: null,
          recording: REC_STATE.stopped,
        };
        void sendToActiveTab({
          type: messages.content.to.unmount,
        });
        void sendToActiveTab({
          type: messages.content.to.notification,
          message: "Error starting recording",
        });
        return;
      }
      const mountMsg = {
        type: "content:start",
        microphone,
        time: 0,
        slackChannels,
        activeTabId,
        withConsole,
        state: "recording",
        // by default this is already handled by :start event
        // that triggers mount with countdown
        shouldMount: false,
      };
      void sendToActiveTab(mountMsg);
      if (withNetwork) {
        startTrackingNetwork();
      }

      let previousTab: number | null = usedTab ?? null;
      function tabActivatedListener({ tabId }: { tabId: number }) {
        const state = getRecState();
        if (state === REC_STATE.stopped) {
          stopTabActivationListening();
        }
        if (tabId !== previousTab) {
          browser.runtime
            .sendMessage({
              type: messages.offscreen.to.checkRecStatus,
              target: "offscreen",
            })
            .then((r) => {
              console.log(r);
              const msg = {
                ...mountMsg,
                ...r,
                shouldMount: true,
                state: getRecState(),
                activeTabId: null,
              };
              void sendToActiveTab(msg);
            });
          if (previousTab) {
            const unmountMsg = { type: messages.content.to.unmount };
            void browser.tabs.sendMessage(previousTab, unmountMsg);
          }
          previousTab = tabId;
        }
      }
      function startTabActivationListening() {
        browser.tabs.onActivated.addListener(tabActivatedListener);
      }
      function stopTabActivationListening() {
        browser.tabs.onActivated.removeListener(tabActivatedListener);
      }

      const trackedTab: number | null = usedTab ?? null;
      function tabUpdateListener(tabId: number, changeInfo: any) {
        const state = getRecState();
        if (state === REC_STATE.stopped) {
          return stopTabListening();
        }

        if (changeInfo.status !== "complete") {
          return (contentArmy[tabId] = false);
        }

        if (area === "tab" && (!trackedTab || tabId !== trackedTab)) {
          return;
        }

        browser.runtime
          .sendMessage({
            type: messages.offscreen.to.checkRecStatus,
            target: "offscreen",
          })
          .then((r) => {
            const msg = {
              ...mountMsg,
              ...r,
              shouldMount: true,
              state,
              activeTabId: area === "desktop" ? null : activeTabId,
            };
            void sendToActiveTab(msg);
          });
      }

      function tabRemovedListener(tabId: number) {
        if (tabId === trackedTab) {
          void browser.runtime.sendMessage({
            type: "offscr:stop-discard",
            target: "offscreen",
          });
          finalVideoBase64 = "";
          finalReady = false;
          finalSpotObj = defaultSpotObj;
          recordingState = {
            activeTabId: null,
            area: null,
            recording: REC_STATE.stopped,
          };
        }
      }

      function startRemovedListening() {
        browser.tabs.onRemoved.addListener(tabRemovedListener);
      }

      function stopRemovedListening() {
        browser.tabs.onRemoved.removeListener(tabRemovedListener);
      }

      function startTabListening() {
        browser.tabs.onUpdated.addListener(tabUpdateListener);
      }

      function stopTabListening() {
        browser.tabs.onUpdated.removeListener(tabUpdateListener);
      }

      startTabListening();
      if (area === "desktop") {
        startTabActivationListening();
      }
      if (area === "tab") {
        startRemovedListening();
      }
      setOnStop?.(() => {
        stopTabListening();
        if (area === "desktop") {
          stopTabActivationListening();
        }
        if (area === "tab") {
          stopRemovedListening();
        }
      });
    } catch (e) {
      console.error("Error starting recording", e, activeTab, activeTabId);
    }
  }

  const decodeJwt = (jwt: string): any => {
    const base64Url = jwt.split(".")[1];
    if (!base64Url) {
      return { exp: 0 }
    }
    const base64 = base64Url.replace("-", "+").replace("_", "/");
    return JSON.parse(atob(base64));
  };

  const isTokenExpired = (token: string): boolean => {
    const decoded: any = decodeJwt(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  };

  function getRequestStatus(request: any): number {
    if (request.statusCode) {
      return request.statusCode;
    }
    if (request.error) {
      return 0
    }
    return 200;
  }
});
