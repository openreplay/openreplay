import { isTokenExpired } from "~/utils/jwt";
import {
  startTrackingNetwork,
  getFinalRequests,
  stopTrackingNetwork,
} from "~/utils/networkTracking";
import {
  mergeRequests,
  SpotNetworkRequest,
} from "~/utils/networkTrackingUtils";
import { safeApiUrl, base64ToBlob } from "~/utils/smallUtils";
import {
  attachDebuggerToTab,
  stopDebugger,
  getRequests as getDebuggerRequests,
  resetMap,
} from "~/utils/networkDebuggerTracking";
import { onMessage, sendMessage, notifyPopup } from "~/utils/messaging";
import type { SpotLog, SpotClick, SpotLocation } from "~/utils/messaging";
import {
  settingsStore,
  patchSettings,
  jwtTokenStore,
  recStateStore,
  DEFAULT_REC_STATE,
  DEFAULT_SETTINGS,
  type Settings,
  type RecState,
} from "~/utils/storage";

export default defineBackground(() => {
  const VER = browser.runtime.getManifest().version;

  const ALARM_REFRESH = "spot-refresh";
  const ALARM_PING = "spot-ping";

  interface SpotBuffers {
    logs: SpotLog[];
    clicks: SpotClick[];
    locations: SpotLocation[];
    vitals: { name: string; value: number }[];
    network: SpotNetworkRequest[];
    base64data: string[];
    mtype: string;
    duration: number;
    startTs: number;
  }
  const makeBuffers = (): SpotBuffers => ({
    logs: [],
    clicks: [],
    locations: [],
    vitals: [],
    network: [],
    base64data: [],
    mtype: "video/webm",
    duration: 0,
    startTs: 0,
  });
  let buffers = makeBuffers();
  let injectNetworkRequests: SpotNetworkRequest[] = [];

  let jwtToken = "";
  let micStatus: "on" | "off" = "off";
  let settingsCache: Settings = DEFAULT_SETTINGS;
  const slackChannels: { name: string; webhookId: number }[] = [];
  let lastStartReq: {
    area: "tab" | "desktop";
    mic: boolean;
    audioId: string;
    permissions: boolean;
  } | null = null;

  // Mirror of the session-persisted recording state for synchronous reads.
  let recState: RecState = { ...DEFAULT_REC_STATE };
  async function setRecState(patch: Partial<RecState>): Promise<RecState> {
    recState = { ...recState, ...patch };
    await recStateStore.setValue(recState);
    return recState;
  }
  async function resetRecState(): Promise<void> {
    await setRecState({ ...DEFAULT_REC_STATE, audioPerm: recState.audioPerm });
  }

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const permToState = (permissions: boolean, mic: boolean): 0 | 1 | 2 =>
    permissions ? (mic ? 2 : 1) : 0;

  async function resolveTabId(
    explicit?: number | null,
  ): Promise<number | undefined> {
    if (explicit != null) return explicit;
    let tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) tabs = await browser.tabs.query({});
    return tabs[0]?.id;
  }

  async function reinjectContent(tabId: number): Promise<void> {
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ["/content-scripts/content.js"],
      });
    } catch (e) {
      // chrome://, store pages, etc. — nothing we can do.
    }
  }

  /**
   * Deliver a message the recording UI depends on. Retries while the content
   * script spins up and re-injects it once if it never answers, so delivery
   * survives a service-worker restart.
   */
  async function sendToTab(
    type: any,
    data: any,
    explicitTabId?: number | null,
  ): Promise<void> {
    const tabId = await resolveTabId(explicitTabId);
    if (tabId == null) return;
    let reinjected = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await sendMessage(type, data, tabId);
        return;
      } catch (e) {
        // Only re-inject after the content script has had ~1.5s to load and
        // register its listeners, so a slow page doesn't get a duplicate UI.
        if (!reinjected && attempt >= 15) {
          reinjected = true;
          await reinjectContent(tabId);
        }
        await delay(100);
      }
    }
    console.warn("Spot: content script unreachable in tab", tabId, type);
  }

  /** Fire-and-forget delivery for non-critical pushes (notifications, chunks). */
  async function pushToTab(
    type: any,
    data: any,
    explicitTabId?: number | null,
  ): Promise<void> {
    const tabId = await resolveTabId(explicitTabId);
    if (tabId == null) return;
    try {
      await sendMessage(type, data, tabId);
    } catch (e) {}
  }

  function armAlarms() {
    void browser.alarms.create(ALARM_REFRESH, { periodInMinutes: 1 });
    void browser.alarms.create(ALARM_PING, { periodInMinutes: 1 });
  }
  function disarmAlarms() {
    void browser.alarms.clear(ALARM_REFRESH);
    void browser.alarms.clear(ALARM_PING);
  }

  function setJWTToken(token: string) {
    jwtToken = token;
    if (token && token.length) {
      void jwtTokenStore.setValue(token);
      notifyPopup("popup:login");
      armAlarms();
    } else {
      void jwtTokenStore.removeValue();
      notifyPopup("popup:no-login");
      disarmAlarms();
    }
  }

  async function refreshToken(): Promise<boolean> {
    const [token, settings] = await Promise.all([
      jwtTokenStore.getValue(),
      settingsStore.getValue(),
    ]);
    settingsCache = settings;
    if (!token) {
      setJWTToken("");
      return false;
    }
    if (!isTokenExpired(token)) {
      jwtToken = token;
      return true;
    }
    const refreshUrl = `${safeApiUrl(settings.ingestPoint)}/api/spot/refresh`;
    try {
      const resp = await fetch(refreshUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        setJWTToken("");
        return false;
      }
      const dataObj = await resp.json();
      setJWTToken(dataObj.jwt);
      return true;
    } catch (e) {
      console.error("Spot: refresh failed", e);
      return false;
    }
  }

  async function pingJWT(): Promise<void> {
    const [token, settings] = await Promise.all([
      jwtTokenStore.getValue(),
      settingsStore.getValue(),
    ]);
    if (!token) {
      disarmAlarms();
      return;
    }
    const url = safeApiUrl(`${safeApiUrl(settings.ingestPoint)}/spot/v1/ping`);
    try {
      const r = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Ext-Version": VER },
      });
      if (!r.ok) void refreshToken();
    } catch (e) {
      void refreshToken();
    }
  }

  let checkBusy = false;
  async function checkTokenValidity(): Promise<void> {
    if (checkBusy) return;
    checkBusy = true;
    try {
      const token = await jwtTokenStore.getValue();
      if (!token) {
        notifyPopup("popup:no-login");
        return;
      }
      jwtToken = token;
      const ok = await refreshToken();
      if (ok) {
        jwtToken = await jwtTokenStore.getValue();
        armAlarms();
      }
    } finally {
      checkBusy = false;
    }
  }

  async function startRecording(
    area: "tab" | "desktop",
    microphone: boolean,
    audioId: string,
    activeTabId: number | undefined,
  ): Promise<void> {
    const usedTab = await resolveTabId(activeTabId);
    try {
      const streamId = await browser.tabCapture.getMediaStreamId({
        targetTabId: usedTab,
      });
      const resp = await sendMessage("offscr:start-recording", {
        data: streamId,
        area,
        microphone,
        audioId,
      });
      if (!resp?.success) {
        await resetRecState();
        await pushToTab("content:unmount", undefined, activeTabId ?? null);
        await pushToTab(
          "notif:display",
          { message: "Error starting recording" },
          activeTabId ?? null,
        );
        return;
      }
      await setRecState({
        recording: "recording",
        area,
        activeTabId: area === "tab" ? (usedTab ?? null) : null,
        trackedTab: area === "tab" ? (usedTab ?? null) : null,
        previousTab: usedTab ?? null,
        microphone,
        withNetwork: settingsCache.networkLogs,
        withConsole: settingsCache.consoleLogs,
      });
      await sendToTab(
        "content:start",
        {
          microphone,
          time: 0,
          slackChannels,
          activeTabId,
          withConsole: settingsCache.consoleLogs,
          withNetwork: settingsCache.networkLogs,
          state: "recording",
          // mount already happened via the countdown flow
          shouldMount: false,
        },
        activeTabId ?? null,
      );
    } catch (e) {
      console.error("Spot: error starting recording", e, activeTabId);
    }
  }

  async function discardActiveRecording(): Promise<void> {
    void sendMessage("offscr:stop-discard").catch(() => {});
    buffers = makeBuffers();
    injectNetworkRequests = [];
    await resetRecState();
  }

  // Listeners registered synchronously so they survive a service-worker
  // restart; they read the persisted recording state and no-op when idle.

  /** Re-mount the recording UI after the followed tab finishes navigating. */
  browser.webNavigation.onCompleted.addListener(async (details) => {
    const rec = await recStateStore.getValue();
    if (rec.recording === "stopped") return;
    if (details.frameId !== 0) return; // top frame only
    if (
      rec.area === "tab" &&
      (rec.trackedTab == null || details.tabId !== rec.trackedTab)
    ) {
      return;
    }
    const status = await sendMessage("offscr:check-status").catch(() => ({
      status: false,
      time: 0,
    }));
    await sendToTab(
      "content:start",
      {
        microphone: rec.microphone,
        time: status.time,
        slackChannels,
        activeTabId: rec.area === "desktop" ? null : rec.activeTabId,
        withConsole: rec.withConsole,
        withNetwork: rec.withNetwork,
        state: rec.recording,
        shouldMount: true,
      },
      rec.area === "desktop" ? null : rec.activeTabId,
    );
  });

  /** Desktop recording: move the UI to whichever tab the user switches to. */
  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    const rec = await recStateStore.getValue();
    if (rec.recording === "stopped" || rec.area !== "desktop") return;
    if (tabId === rec.previousTab) return;

    const status = await sendMessage("offscr:check-status").catch(() => ({
      status: false,
      time: 0,
    }));
    if (settingsCache.useDebugger && rec.withNetwork) {
      void attachDebuggerToTab(tabId);
    }
    await sendToTab(
      "content:start",
      {
        microphone: rec.microphone,
        time: status.time,
        slackChannels,
        activeTabId: null,
        withConsole: rec.withConsole,
        withNetwork: rec.withNetwork,
        state: rec.recording,
        shouldMount: true,
      },
      tabId,
    );
    if (rec.previousTab != null) {
      void pushToTab("content:unmount", undefined, rec.previousTab);
    }
    await setRecState({ previousTab: tabId });
  });

  /** Tab recording: discard if the recorded tab is closed. */
  browser.tabs.onRemoved.addListener(async (tabId) => {
    const rec = await recStateStore.getValue();
    if (rec.recording === "stopped" || rec.area !== "tab") return;
    if (tabId === rec.trackedTab) {
      await discardActiveRecording();
    }
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_REFRESH) void refreshToken();
    else if (alarm.name === ALARM_PING) void pingJWT();
  });

  onMessage("popup:start", async ({ data }) => {
    lastStartReq = {
      area: data.area,
      mic: data.mic,
      audioId: data.audioId,
      permissions: data.permissions,
    };
    buffers = makeBuffers();
    injectNetworkRequests = [];
    await setRecState({
      ...DEFAULT_REC_STATE,
      audioPerm: permToState(data.permissions, data.mic),
    });

    if (data.area === "tab") {
      const tabId = await resolveTabId();
      if (tabId != null) await setRecState({ activeTabId: tabId });
    } else if (!settingsCache.useDebugger) {
      startTrackingNetwork();
    }

    await sendToTab(
      "content:mount",
      {
        area: data.area,
        mic: data.mic,
        audioId: data.audioId,
        audioPerm: permToState(data.permissions, data.mic),
      },
      recState.activeTabId,
    );
  });

  onMessage("ort:countend", async ({ data }) => {
    if (!jwtToken) {
      const stored = await jwtTokenStore.getValue();
      if (!stored) {
        console.error("Spot: no JWT token found");
        notifyPopup("popup:no-login");
        return false;
      }
      setJWTToken(stored);
    }

    buffers.base64data = [];
    buffers.startTs = Date.now();

    if (settingsCache.networkLogs) {
      if (settingsCache.useDebugger) {
        resetMap();
        const tabId = await resolveTabId();
        if (tabId == null) {
          console.error("Spot: no active tab found");
        } else {
          await setRecState({ activeTabId: tabId });
          void attachDebuggerToTab(tabId);
        }
      } else {
        startTrackingNetwork();
      }
    }

    micStatus = data.mic ? "on" : "off";
    if (data.area === "tab") {
      let tabId = recState.activeTabId;
      if (tabId == null) tabId = (await resolveTabId()) ?? null;
      await setRecState({ activeTabId: tabId, area: "tab" });
      await startRecording("tab", data.mic, data.audioId, tabId ?? undefined);
    } else {
      await setRecState({ area: "desktop", activeTabId: null });
      await startRecording("desktop", data.mic, data.audioId, undefined);
    }
    return true;
  });

  onMessage("popup:check-status", async () => {
    // Read persisted state: right after an idle service-worker wake the
    // in-memory caches may not be rehydrated yet.
    const [token, rec] = await Promise.all([
      jwtTokenStore.getValue(),
      recStateStore.getValue(),
    ]);
    if (token) {
      notifyPopup("popup:login");
      if (rec.recording !== "stopped") notifyPopup("popup:started");
    } else {
      notifyPopup("popup:no-login");
    }
  });

  onMessage("popup:stop", () => {
    void pushToTab("content:stop", undefined, recState.activeTabId);
  });

  onMessage("ort:check-new-tab", async () => {
    const settings = await settingsStore.getValue();
    return Boolean(settings.openInNewTab);
  });

  onMessage("ort:started", () => notifyPopup("popup:started"));
  onMessage("ort:stopped", () => notifyPopup("popup:stopped"));

  onMessage("popup:get-audio-perm", () => {
    void browser.tabs.create({
      url: browser.runtime.getURL("/audio.html"),
      active: true,
    });
  });

  onMessage("audio:audio-perm", () => notifyPopup("popup:audio-perm"));

  onMessage("ort:login-token", async ({ data }) => {
    setJWTToken(data.token);
    if (data.ingest) {
      settingsCache = await patchSettings({ ingestPoint: data.ingest });
    }
  });

  onMessage("ort:invalidate-token", () => {
    setJWTToken("");
  });

  onMessage("ort:getMicStatus", () => ({ micStatus: micStatus === "on" }));

  onMessage("ort:settings", async ({ data }) => {
    settingsCache = await patchSettings(data.settings);
    if ("ingestPoint" in data.settings) setJWTToken("");
  });

  onMessage("ort:bump-logs", ({ data }) => {
    buffers.logs.push(...data.logs);
    return "pong";
  });
  onMessage("ort:bump-network", ({ data }) => {
    injectNetworkRequests.push(data.event);
    return "pong";
  });
  onMessage("ort:bump-clicks", ({ data }) => {
    buffers.clicks.push(...data.clicks);
    return "pong";
  });
  onMessage("ort:bump-location", ({ data }) => {
    buffers.locations.push(data.location);
    return "pong";
  });
  onMessage("ort:bump-vitals", ({ data }) => {
    buffers.vitals.push({ name: data.vitals.name, value: data.vitals.value });
    return "pong";
  });

  onMessage("ort:discard", async () => {
    buffers = makeBuffers();
    injectNetworkRequests = [];
    await resetRecState();
  });

  onMessage("ort:restart", async () => {
    void sendMessage("offscr:stop-discard").catch(() => {});
    buffers = makeBuffers();
    injectNetworkRequests = [];
    await resetRecState();
    if (lastStartReq) {
      await sendToTab(
        "content:mount",
        {
          area: lastStartReq.area,
          mic: lastStartReq.mic,
          audioId: lastStartReq.audioId,
          audioPerm: permToState(lastStartReq.permissions, lastStartReq.mic),
        },
        recState.activeTabId,
      );
    }
  });

  onMessage("ort:get-error-events", () => {
    const logs = buffers.logs
      .filter((log) => log.level === "error")
      .map((l) => ({
        title: "JS Error",
        time: (l.time - buffers.startTs) / 1000,
      }));
    const network = [...injectNetworkRequests, ...buffers.network]
      .filter((net) => net.statusCode >= 400 || net.error)
      .map((n) => ({
        title: "Network Error",
        time: (n.time - buffers.startTs) / 1000,
      }));
    return [...logs, ...network].sort((a, b) => a.time - b.time);
  });

  onMessage("ort:stop", async () => {
    if (recState.recording === "stopped") {
      console.error("Spot: stop called on a stopped recording");
      return { status: "stopped" };
    }
    let mappedNetwork: any[] = [];
    if (settingsCache.networkLogs) {
      if (settingsCache.useDebugger) {
        stopDebugger();
        mappedNetwork = getDebuggerRequests() as any[];
      } else {
        const networkRequests = getFinalRequests(
          recState.area === "tab" ? recState.activeTabId ?? undefined : undefined,
        );
        stopTrackingNetwork();
        mappedNetwork = mergeRequests(networkRequests, injectNetworkRequests);
      }
    }
    injectNetworkRequests = [];
    buffers.network = mappedNetwork;

    const r = await sendMessage("offscr:stop-recording").catch(() => ({
      status: "error" as const,
    }));
    await setRecState({ recording: "stopped" });
    return r;
  });

  onMessage("offscr:video-data-chunk", ({ data }) => {
    buffers.duration = data.duration;
    buffers.base64data.push(data.data);
    buffers.mtype = data.mtype;
    void pushToTab(
      "content:video-chunk",
      {
        data: data.data,
        index: data.index,
        total: data.total,
        mtype: data.mtype,
      },
      recState.activeTabId,
    );
  });

  onMessage("ort:pause", async () => {
    void sendMessage("offscr:pause-recording").catch(() => {});
    await setRecState({ recording: "paused" });
  });
  onMessage("ort:resume", async () => {
    void sendMessage("offscr:resume-recording").catch(() => {});
    await setRecState({ recording: "recording" });
  });

  onMessage("ort:mute-microphone", () => {
    micStatus = "off";
    void sendMessage("offscr:mute-microphone").catch(() => {});
    // The recording UI reads mic state via ort:getMicStatus (on toggle / on
    // re-mount), so there is no separate push to the content script.
    notifyPopup("popup:mic-status", { status: false });
  });
  onMessage("ort:unmute-microphone", () => {
    micStatus = "on";
    void sendMessage("offscr:unmute-microphone").catch(() => {});
    notifyPopup("popup:mic-status", { status: true });
  });

  onMessage("ort:save-spot", ({ data }) => {
    void saveSpot(data.spot);
    return "pong";
  });

  async function saveSpot(meta: {
    name?: string;
    comment?: string;
    useHook?: boolean;
    preview?: string;
    resolution?: string;
    browserVersion?: string | null;
    crop?: [number, number];
  }): Promise<void> {
    const settings = await settingsStore.getValue();
    settingsCache = settings;
    const crop = meta.crop ?? null;
    const duration = crop ? crop[1] - crop[0] : buffers.duration;
    const dataObj = {
      name: meta.name,
      comment: meta.comment,
      preview: meta.preview,
      duration,
      crop,
      vitals: buffers.vitals,
    };

    const vendor = await browser.runtime.getPlatformInfo();
    const platform = `${vendor.os} ${vendor.arch}`;

    const cropped = !!crop && crop[0] + crop[1] > 0;
    let logs = buffers.logs;
    let network = buffers.network;
    let locations = buffers.locations;
    if (cropped && crop) {
      const start = buffers.startTs + crop[0];
      const end = buffers.startTs + crop[1];
      logs = buffers.logs.filter((l) => l.time >= start && l.time <= end);
      network = buffers.network.filter((n) => n.time >= start && n.time <= end);
      locations = buffers.locations.filter(
        (l) => l.time >= start && l.time <= end,
      );
    }

    const mobData = {
      clicks: buffers.clicks,
      logs,
      network,
      locations,
      startTs: buffers.startTs,
      resolution: meta.resolution,
      browserVersion: meta.browserVersion,
      platform,
    };

    const ingestUrl = safeApiUrl(settings.ingestPoint);
    const notifyError = (message: string) =>
      void pushToTab("notif:display", { message }, recState.activeTabId);

    try {
      const refreshed = await refreshToken();
      if (!refreshed) {
        notifyError("Error saving Spot: couldn't get active login");
      }

      const resp = await fetch(`${ingestUrl}/spot/v1/spots`, {
        method: "POST",
        body: JSON.stringify(dataObj),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
          "Ext-Version": VER,
        },
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          setJWTToken("");
          throw new Error("Not authorized or no permissions to create Spot");
        }
        throw new Error(`Couldn't create Spot (${resp.status})`);
      }
      const spot = await resp.json();
      await setRecState({ ...DEFAULT_REC_STATE, audioPerm: recState.audioPerm });

      if (!spot || !spot.id) {
        return notifyError("Couldn't create Spot");
      }
      const { id, mobURL, videoURL } = spot;
      const ingestHost = settings.ingestPoint
        ? new URL(settings.ingestPoint).hostname
        : "";
      const link =
        ingestHost === "api.openreplay.com"
          ? "https://app.openreplay.com"
          : settings.ingestPoint;
      const viewUrl = `${link}/view-spot/${id}`;
      void pushToTab("content:spot-saved", { url: viewUrl }, recState.activeTabId);
      setTimeout(() => {
        void browser.tabs.create({ url: viewUrl, active: settings.openInNewTab });
      }, 250);

      const blob = base64ToBlob(buffers.base64data, buffers.mtype);
      await Promise.all([
        fetch(mobURL, {
          method: "PUT",
          body: JSON.stringify(mobData),
          headers: { "Content-Type": "application/json" },
        }),
        fetch(videoURL, {
          method: "PUT",
          headers: { "Content-Type": "video/webm" },
          body: blob,
        }),
      ]);
      void fetch(`${ingestUrl}/spot/v1/spots/${id}/uploaded`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwtToken}` },
      }).catch(console.error);
    } catch (e: any) {
      console.error(e);
      notifyError(`Error saving Spot: ${e.message}`);
    } finally {
      buffers = makeBuffers();
      injectNetworkRequests = [];
    }
  }

  async function initializeOffscreenDocument(): Promise<void> {
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
      console.error("Spot: can't create new offscreen document", e);
    }
  }

  browser.runtime.setUninstallURL("https://forms.gle/sMo8da2AvrPg5o7YA");

  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === "install") {
      await browser.tabs.create({
        url: "https://openreplay.com/platform/spot/welcome?ref=extension",
        active: true,
      });
    }
    // Restore the content script into already-open tabs after install/update.
    for (const tab of await browser.tabs.query({})) {
      if (!tab.id || tab.url?.match(/(chrome|chrome-extension):\/\//gi)) continue;
      await reinjectContent(tab.id);
    }
    await checkTokenValidity();
    void initializeOffscreenDocument();
  });

  browser.runtime.onStartup.addListener(() => {
    void checkTokenValidity();
    void initializeOffscreenDocument();
  });

  // Rehydrate the in-memory caches whenever the worker (re)starts.
  void recStateStore.getValue().then((s) => {
    recState = s;
  });
  void settingsStore.getValue().then((s) => {
    settingsCache = s;
    if (!settingsCache) {
      settingsCache = DEFAULT_SETTINGS;
      void settingsStore.setValue(DEFAULT_SETTINGS);
    }
  });
  void checkTokenValidity();
  void initializeOffscreenDocument();
});
