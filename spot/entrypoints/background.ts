import { isTokenExpired } from "~/utils/jwt";
import {
  startTrackingNetwork,
  getFinalRequests,
  stopTrackingNetwork,
} from "~/utils/networkTracking";
import { mergeRequests, SpotNetworkRequest } from "~/utils/networkTrackingUtils";
import { safeApiUrl, base64ToBlob } from '~/utils/smallUtils'
import {
  attachDebuggerToTab,
  stopDebugger,
  getRequests as getDebuggerRequests,
  resetMap,
} from "~/utils/networkDebuggerTracking";
import { messages } from '~/utils/messages'

let checkBusy = false;

export default defineBackground(() => {
  const CHECK_INT = 60 * 1000;
  const PING_INT = 30 * 1000;
  const VER = "1.0.21";

  interface SpotObj {
    name: string;
    comment: string;
    useHook: string;
    preview: string;
    base64data: string;
    mtype: string;
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
    useDebugger: false,
    ingestPoint: "https://app.openreplay.com",
  };
  const defaultSpotObj = {
    name: "",
    comment: "",
    useHook: "",
    preview: "",
    base64data: "",
    mtype: "video/webm",
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
  let finalReady = false;
  let finalSpotObj: SpotObj = defaultSpotObj;
  let injectNetworkRequests = [];
  let onStop: (() => void) | null = null;
  let settings = defaultSettings;
  type recState = {
    activeTabId: number | null;
    area: string | null;
    recording: string;
    audioPerm: number;
  }
  let recordingState: recState = {
    activeTabId: null,
    area: null,
    recording: REC_STATE.stopped,
    audioPerm: 0,
  }
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
        if (!settings.useDebugger) {
          startTrackingNetwork();
        }
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
      const recArea = request.area;
      finalSpotObj.base64data = "";
      finalSpotObj.startTs = Date.now();
      if (settings.networkLogs) {
        if (settings.useDebugger) {
          resetMap();
          browser.tabs.query({
            active: true,
            currentWindow: true,
          }).then((tabs) => {
            if (tabs.length === 0) {
              return console.error("No active tab found");
            }
            recordingState.activeTabId = tabs[0].id;
            void attachDebuggerToTab(recordingState.activeTabId)
          })
        } else {
          startTrackingNetwork();
        }
      }
      if (recArea === "tab") {
        function signalTabRecording() {
          recordingState = {
            activeTabId: recordingState.activeTabId,
            area: "tab",
            recording: REC_STATE.recording,
            audioPerm: recordingState.audioPerm,
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
          audioPerm: recordingState.audioPerm
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
      if (request.ingest) {
        const updatedSettings = Object.assign(settings, { ingestPoint: request.ingest });
        settings = updatedSettings;
        void browser.storage.local.set({ settings: updatedSettings });
      }
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
      injectNetworkRequests.push(request.event);
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
        mtype: "video/webm",
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
      finalReady = false;
      recordingState = {
        activeTabId: null,
        area: null,
        recording: REC_STATE.stopped,
        audioPerm: recordingState.audioPerm
      };
    }
    if (request.type === messages.content.from.restart) {
      void browser.runtime.sendMessage({
        type: "offscr:stop-discard",
        target: "offscreen",
      });
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
      const network = [...injectNetworkRequests, ...finalSpotObj.network]
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
        return console.error("Calling stopped recording?");
      }
      let networkRequests: any = [];
      let mappedNetwork: any = [];
      if (settings.networkLogs) {
        if (settings.useDebugger) {
          stopDebugger();
          mappedNetwork = getDebuggerRequests();
        } else {
          networkRequests = getFinalRequests(
            recordingState.area === 'tab' ? recordingState.activeTabId! : undefined,
          );
          stopTrackingNetwork();
          mappedNetwork = mergeRequests(
            networkRequests,
            injectNetworkRequests,
          );
        }
      }
      injectNetworkRequests = [];
      finalSpotObj.network = mappedNetwork;
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
      finalSpotObj.base64data += request.data;
      finalSpotObj.mtype = request.mtype;
      void sendToActiveTab({
        type: "content:video-chunk",
        data: request.data,
        index: request.index,
        total: request.total,
        mtype: request.mtype,
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
      const getPlatformData = async () => {
          const vendor = await browser.runtime.getPlatformInfo();
          const platform = `${vendor.os} ${vendor.arch}`;
          return { platform };
        };
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
                    audioPerm: recordingState.audioPerm
                  };
                  // id of spot, mobURL - for events, videoURL - for video
                  if (!resp || !resp.id) {
                    return sendToActiveTab({
                      type: messages.content.to.notification,
                      message: "Couldn't create Spot",
                    });
                  }
                  const { id, mobURL, videoURL } = resp;
                  const ingestUrl = settings.ingestPoint ? new URL(settings.ingestPoint) : { hostname: '' };
                  const link = ingestUrl.hostname === "api.openreplay.com"
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
                  const blob = base64ToBlob(finalSpotObj.base64data, finalSpotObj.mtype);

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
      return "pong";
    }
  });

  void browser.runtime.setUninstallURL("https://forms.gle/sMo8da2AvrPg5o7YA");
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    // Also fired on update and browser_update
    if (reason === "install") {
      await browser.tabs.create({
        url: "https://openreplay.com/platform/spot/welcome?ref=extension",
        active: true,
      });
    }
    for (const tab of await chrome.tabs.query({})) {
      if (tab.url?.match(/(chrome|chrome-extension):\/\//gi) || !tab.id) {
        continue;
      }
      const res = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["/content-scripts/content.js"],
      });
      console.log('restoring content at', res)
    }
    await checkTokenValidity();
    void initializeOffscreenDocument();
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
      try {
        await browser.offscreen.closeDocument();
      } catch (e) {
        console.error("Spot: error closing old offscreen document", e);
      }
    }

    try {
      await browser.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["DISPLAY_MEDIA", "USER_MEDIA", "BLOBS", "AUDIO_PLAYBACK"],
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
  }, onSent?: (tabId: number) => void) {
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
      onSent?.(sendTo);
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
          audioPerm: recordingState.audioPerm
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
        type: messages.content.to.start,
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
              console.log(tabId, 'activation for new')
              attachDebuggerToTab(tabId)
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
        contentArmy[details.tabId] = false;

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
        browser.webNavigation.onCompleted.addListener(tabNavigatedListener);
      }
      function stopNavListening() {
        browser.webNavigation.onCompleted.removeListener(tabNavigatedListener);
      }

      /** discards recording if was recording single tab and its now closed */
      function tabRemovedListener(tabId: number) {
        if (tabId === trackedTab) {
          void browser.runtime.sendMessage({
            type: "offscr:stop-discard",
            target: "offscreen",
          });
          finalReady = false;
          finalSpotObj = defaultSpotObj;
          recordingState = {
            activeTabId: null,
            area: null,
            recording: REC_STATE.stopped,
            audioPerm: recordingState.audioPerm
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
