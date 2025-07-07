import { isTokenExpired } from "~/utils/jwt";

let checkBusy = false;

export default defineBackground(() => {
  const CHECK_INT = 60 * 1000;
  const PING_INT = 30 * 1000;
  const VER = "1.0.10";

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
        toStop: "ort:stop",
        restart: "ort:restart",
        getErrorEvents: "ort:get-error-events",
      },
      to: {
        setJWT: "content:set-jwt",
        micStatus: "content:mic-status",
        unmount: "content:unmount",
        notification: "notif:display",
        updateErrorEvents: "content:error-events",
      },
    },
    injected: {
      from: {
        bumpLogs: "ort:bump-logs",
        bumpNetwork: "ort:bump-network",
      },
    },
    offscreen: {
      to: {
        checkRecStatus: "offscr:check-status",
        startRecording: "offscr:start-recording",
        stopRecording: "offscr:stop-recording",
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

  const defaultSettings = {
    openInNewTab: true,
    consoleLogs: true,
    networkLogs: true,
    ingestPoint: "https://app.openreplay.com",
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
  let settings = defaultSettings;
  let recordingState = {
    activeTabId: null,
    area: null,
    recording: REC_STATE.stopped,
    audioPerm: 0,
  } as Record<string, any>;
  let jwtToken = "";
  let refreshInt: any;
  let pingInt: any;

  function setJWTToken(token: string) {
    jwtToken = token;
    if (token && token.length) {
      void browser.storage.local.set({ jwtToken: token });
      void browser.runtime.sendMessage({
        type: messages.popup.loginExist,
      });
      if (!refreshInt) {
        refreshInt = setInterval(() => {
          void refreshToken();
        }, CHECK_INT);
      }

      if (!pingInt) {
        pingInt = setInterval(() => {
          void pingJWT();
        }, PING_INT);
      }
    } else {
      void browser.storage.local.remove("jwtToken");
      void browser.runtime.sendMessage({
        type: messages.popup.to.noLogin,
      });
      if (refreshInt) {
        clearInterval(refreshInt);
      }
      if (pingInt) {
        clearInterval(pingInt);
      }
    }
  }

  function safeApiUrl(url: string) {
    let str = url;
    if (str.endsWith("/")) {
      str = str.slice(0, -1);
    }
    if (str.includes("app.openreplay.com")) {
      str = str.replace("app.openreplay.com", "api.openreplay.com");
    }
    return str;
  }

  let slackChannels: { name: string; webhookId: number }[] = [];

  void checkTokenValidity();
  browser.storage.local.get("settings").then(async (data: any) => {
    if (!data.settings) {
      void browser.storage.local.set({ settings });
      return;
    }
    settings = Object.assign(settings, data.settings);
  });

  async function refreshToken() {
    const data = await browser.storage.local.get(["jwtToken", "settings"]);
    if (!data.settings) {
      await browser.storage.local.set({ defaultSettings });
      data.settings = defaultSettings;
    }
    if (!data.jwtToken) {
      setJWTToken("");
    }
    const { jwtToken, settings } = data;
    const refreshUrl = `${safeApiUrl(settings.ingestPoint)}/api/spot/refresh`;
    if (!isTokenExpired(jwtToken) || !jwtToken) {
      if (refreshInt) {
        clearInterval(refreshInt);
      }
      return true;
    }
    const resp = await fetch(refreshUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });
    if (!resp.ok) {
      void browser.storage.local.remove("jwtToken");
      setJWTToken("");
      void browser.runtime.sendMessage({
        type: messages.popup.to.noLogin,
      });
      return false;
    }
    const dataObj = await resp.json();
    const refreshedJwt = dataObj.jwt;
    setJWTToken(refreshedJwt);
    return true;
  }

  const fetchSlackChannels = async (token: string, ingest: string) => {
    await refreshToken();
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

  async function pingJWT(): Promise<void> {
    const data = await browser.storage.local.get(["jwtToken", "settings"]);
    if (!data.settings) {
      await browser.storage.local.set({ defaultSettings });
      data.settings = defaultSettings;
    }
    if (!data.jwtToken) {
      setJWTToken("");
    }
    const { jwtToken, settings } = data;
    const ingest = safeApiUrl(settings.ingestPoint);
    if (!jwtToken) {
      if (pingInt) {
        clearInterval(pingInt);
      }
      return;
    }
    const url = safeApiUrl(`${ingest}/spot/v1/ping`);
    try {
      const r = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          "Ext-Version": VER,
        },
      });
      if (!r.ok) {
        void refreshToken();
      }
    } catch (e) {
      void refreshToken();
    }
  }

  let lastReq: Record<string, any> | null = null;
  async function checkTokenValidity() {
    if (checkBusy) return;
    checkBusy = true;
    const data = await browser.storage.local.get("jwtToken");
    if (!data.jwtToken) {
      void browser.runtime.sendMessage({
        type: messages.popup.to.noLogin,
      });
      checkBusy = false;
      return;
    }
    const ok = await refreshToken();
    if (ok) {
      setJWTToken(data.jwtToken);
      if (!refreshInt) {
        refreshInt = setInterval(() => {
          void refreshToken();
        }, CHECK_INT);
      }
      if (!pingInt) {
        pingInt = setInterval(() => {
          void pingJWT();
        }, PING_INT);
      }
    }
    checkBusy = false;
  }
  // @ts-ignore
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
        audioPerm: request.permissions ? (request.mic ? 2 : 1) : 0,
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
              audioId: request.audioId,
              audioPerm: request.permissions ? (request.mic ? 2 : 1) : 0,
            });
          });
      } else {
        void sendToActiveTab({
          type: "content:mount",
          area: request.area,
          mic: request.mic,
          audioId: request.selectedAudioDevice,
          audioPerm: request.permissions ? (request.mic ? 2 : 1) : 0,
        });
      }
    }
    if (request.type === messages.content.from.countEnd) {
      if (!jwtToken) {
        browser.storage.local.get("jwtToken").then((data: any) => {
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
            (hook) => {
              onStop = hook;
            },
          );
          // @ts-ignore  this is false positive
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
          // @ts-ignore  this is false positive
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
      browser.storage.local.get("settings").then((data: any) => {
        // @ts-ignore  this is false positive
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
      browser.storage.local.get("settings").then((data: any) => {
        if (!data.settings) {
          void browser.storage.local.set({ settings });
          return;
        }
        if (!refreshInt) {
          refreshInt = setInterval(() => {
            void refreshToken();
          }, CHECK_INT);
        }
        if (!pingInt) {
          pingInt = setInterval(() => {
            void pingJWT();
          }, PING_INT);
        }
      });
    }
    if (request.type === messages.content.from.invalidateToken) {
      if (refreshInt) {
        clearInterval(refreshInt);
      }
      if (pingInt) {
        clearInterval(pingInt);
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
      if ("ingestPoint" in request.settings) {
        setJWTToken("");
      }
      void browser.storage.local.set({ settings: updatedObject });
    }
    if (request.type === messages.content.from.checkRecStatus) {
      const id = request.tabId;
      if (recordingState.area === "tab" && id !== recordingState.activeTabId) {
        // @ts-ignore  this is false positive
        respond({ status: false });
      } else {
        browser.runtime
          .sendMessage({
            type: messages.offscreen.to.checkRecStatus,
            target: "offscreen",
          })
          .then((r) => {
            // @ts-ignore  this is false positive
            respond({ ...r, state: recordingState.recording });
          });
      }
      return true;
    }
    if (request.type === messages.content.from.checkLogin) {
      if (jwtToken && jwtToken.length) {
        void sendToActiveTab({
          type: messages.content.to.setJWT,
          jwtToken,
        });
      } else {
        void browser.runtime.sendMessage({
          type: messages.popup.to.noLogin,
        });
      }
    }
    if (request.type === messages.injected.from.bumpLogs) {
      finalSpotObj.logs.push(...request.logs);
      return "pong";
    }
    if (request.type === messages.injected.from.bumpNetwork) {
      finalSpotObj.network.push(request.event);
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
        audioPerm: lastReq!.permissions,
      };
      void sendToActiveTab({
        type: "content:mount",
        area: lastReq!.area,
        mic: lastReq!.mic,
        audioId: lastReq!.selectedAudioDevice,
        audioPerm: lastReq!.permissions,
      });
    }
    if (request.type === messages.content.from.getErrorEvents) {
      const logs = finalSpotObj.logs
        .filter((log) => log.level === "error")
        .map((l) => ({
          title: "JS Error",
          time: (l.time - finalSpotObj.startTs) / 1000,
        }));
      const network = finalSpotObj.network
        .filter((net) => net.statusCode >= 400 || net.error)
        .map((n) => ({
          title: "Network Error",
          time: (n.time - finalSpotObj.startTs) / 1000,
        }));

      const errorData = [...logs, ...network].sort((a, b) => a.time - b.time);

      void sendToActiveTab({
        type: messages.content.to.updateErrorEvents,
        errorData,
      });
    }
    if (request.type === messages.content.from.toStop) {
      if (recordingState.recording === REC_STATE.stopped) {
        return console.error('Calling stopped recording?')
      }
      browser.runtime
        .sendMessage({
          type: messages.offscreen.to.stopRecording,
          target: "offscreen",
        })
        .then((r) => {
          if (r.status === "full") {
            finalSpotObj.duration = r.duration;
            // @ts-ignore  this is false positive
            respond(r);
          } else {
            // @ts-ignore  this is false positive
            respond({ status: r.status });
          }
        });
      onStop?.();
      recordingState.recording = REC_STATE.stopped;

      return true;
    }
    if (request.type === "offscr:video-data-chunk") {
      finalSpotObj.duration = request.duration;
      void sendToActiveTab({
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
      void browser.runtime.sendMessage({
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
      void browser.runtime.sendMessage({
        type: messages.popup.to.micStatus,
        status: true,
      });
    }
    if (request.type === messages.content.from.saveSpotData) {
      Object.assign(finalSpotObj, request.spot);
      return "pong";
    }
    if (request.type === messages.content.from.saveSpotVidChunk) {
      finalVideoBase64 += request.part;
      finalReady = request.index === request.total - 1;
      const getPlatformData = async () => {
        const vendor = await browser.runtime.getPlatformInfo();
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
          duration: duration,
          crop: finalSpotObj.crop,
          vitals: finalSpotObj.vitals,
        };
        const videoData = finalVideoBase64;

        getPlatformData().then(async ({ platform }) => {
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

          const data = await browser.storage.local.get("settings");
          if (!data.settings) {
            return void sendToActiveTab({
              type: messages.content.to.notification,
              message: "Error saving Spot: can't retrieve spot ingest",
            });
          }
          const ingestUrl = safeApiUrl(data.settings.ingestPoint);

          const dataUrl = `${ingestUrl}/spot/v1/spots`;
          refreshToken()
            .then((r) => {
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
                  "Ext-Version": VER,
                },
              })
                .then((r) => {
                  if (r.ok) {
                    return r.json();
                  } else {
                    if (r.status === 401) {
                      setJWTToken("");
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
                      message: "Couldn't create Spot",
                    });
                  }
                  const { id, mobURL, videoURL } = resp;
                  const link = settings.ingestPoint.includes(
                    "api.openreplay.com",
                  )
                    ? "https://app.openreplay.com"
                    : settings.ingestPoint;
                  void sendToActiveTab({
                    type: "content:spot-saved",
                    url: `${link}/view-spot/${id}`,
                  });
                  setTimeout(() => {
                    void browser.tabs.create({
                      url: `${link}/view-spot/${id}`,
                      active: settings.openInNewTab,
                    });
                  }, 250);
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
                    .then(async () => {
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
            .catch((e) => {
              void sendToActiveTab({
                type: messages.content.to.notification,
                message: `Error saving Spot: ${e.message}`,
              });
            });
        });
      }

      return "pong";
    }
  });

  void browser.runtime.setUninstallURL("https://forms.gle/sMo8da2AvrPg5o7YA");
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    // Also fired on update and browser_update
    if (reason === "install") {
      await browser.tabs.create({
        url: "https://www.openreplay.com/platform/spot?ref=extension",
        active: true,
      });
    }
    // in future:
    // const tabs = await browser.tabs.query({}) as chrome.tabs.Tab[]
    // for (const tab of tabs) {
    //   if (tab.id) {
    // this will require more permissions, do we even want this?
    //     void chrome.tabs.executeScript(tab.id, {file: "content"});
    //   }
    // }
    await checkTokenValidity();
    await initializeOffscreenDocument();
  });
  void initializeOffscreenDocument();

  async function initializeOffscreenDocument() {
    const existingContexts = await browser.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
    });

    const offscreenDocument = existingContexts.find(
      (c: { contextType: string }) => c.contextType === "OFFSCREEN_DOCUMENT",
    );
    if (offscreenDocument) {
      return;
      // TODO: check manifestv3 for reloading context
      // try {
      //   await browser.offscreen.closeDocument();
      // } catch (e) {
      //   console.trace(e)
      // }
    }

    try {
      await browser.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["DISPLAY_MEDIA", "USER_MEDIA", "BLOBS"],
        justification: "Recording from chrome.tabCapture API",
      });
    } catch (e) {
      console.error("cant create new offscreen document", e);
    }

    return;
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
    let attempts = 0;
    // 10 seconds;
    while (!contentArmy[sendTo] && attempts < 100) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    if (contentArmy[sendTo]) {
      await browser.tabs.sendMessage(sendTo, message);
    } else {
      console.trace(
        "Content script might not be ready in tab",
        sendTo,
        contentArmy,
        message,
      );
      await browser.tabs.sendMessage(sendTo, message);
    }
  }

  async function sendToOffscreen(message: {
    type: string;
    target: "offscreen";
    data?: any;
    [key: string]: any;
  }) {
    try {
      return await browser.runtime.sendMessage(message);
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
    setOnStop: (hook: any) => void,
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
        withNetwork,
        state: "recording",
        // by default this is already handled by :start event
        // that triggers mount with countdown
        shouldMount: false,
      };
      void sendToActiveTab(mountMsg);
      let previousTab: number | null = usedTab ?? null;

      /** moves ui to active tab when screen recording */
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
      /** moves ui to active tab when screen recording */
      function startTabActivationListening() {
        browser.tabs.onActivated.addListener(tabActivatedListener);
      }
      /** moves ui to active tab when screen recording */
      function stopTabActivationListening() {
        browser.tabs.onActivated.removeListener(tabActivatedListener);
      }

      const trackedTab: number | null = usedTab ?? null;

      /** reloads ui on currently active tab once its reloads itself */
      function tabNavigatedListener(details: { tabId: number }) {
        const state = getRecState();
        if (state === REC_STATE.stopped) {
          return stopNavListening();
        }
        contentArmy[details.tabId] = false

        if (area === "tab" && (!trackedTab || details.tabId !== trackedTab)) {
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

      function startNavListening() {
        browser.webNavigation.onCompleted.addListener(tabNavigatedListener)
      }
      function stopNavListening() {
        browser.webNavigation.onCompleted.removeListener(tabNavigatedListener)
      }

      /** discards recording if was recording single tab and its now closed */
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

      startNavListening();
      if (area === "desktop") {
        // if desktop, watch for tab change events
        startTabActivationListening();
      }
      if (area === "tab") {
        // if tab, watch for tab remove changes to discard recording
        startRemovedListening();
      }
      setOnStop(() => {
        stopNavListening();
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
});
