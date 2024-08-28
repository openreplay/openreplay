import orLogo from "@/assets/orSpot.svg";
import micOff from "@/assets/mic-off-red.svg";
import micOn from "@/assets/mic-on-dark.svg";
import Login from "@/entrypoints/popup/Login";
import Settings from "@/entrypoints/popup/Settings";
import { createSignal, createEffect, onMount } from "solid-js";
import Dropdown from "@/entrypoints/popup/Dropdown";
import Button from "@/entrypoints/popup/Button";

async function getAudioDevices() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices
      .filter((device) => device.kind === "audioinput")
      .map((device) => ({ label: device.label, id: device.deviceId }));

    return { granted: true, audioDevices };
  } catch (error) {
    console.error("Error accessing audio devices:", error);
    const msg = error.message ?? "";
    return {
      granted: false,
      denied: msg.includes("denied"),
      audioDevices: [],
    };
  }
}

const orSite = () => {
  window.open("https://openreplay.com", "_blank");
};

function Header({ openSettings }: { openSettings: () => void }) {
  const openHomePage = async () => {
    const { settings } = await chrome.storage.local.get("settings");
    return window.open(`${settings.ingestPoint}/spots`, "_blank");
  };
  return (
    <div class={"flex items-center gap-1"}>
      <div
        class="flex items-center gap-1 cursor-pointer hover:opacity-50"
        onClick={orSite}
      >
        <img src={orLogo} class="w-5" alt={"OpenReplay Spot"} />
        <div class={"text-neutral-600"}>
          <span class={"text-lg font-semibold text-black"}>Spot</span>
          <span class={"text-xs ml-2"}>by OpenReplay</span>
        </div>
      </div>

      <div class={"ml-auto flex items-center gap-2"}>
        <div class="text-sm tooltip tooltip-bottom" data-tip="My Spots">
          <div onClick={openHomePage}>
            <div class={"cursor-pointer p-2 hover:bg-indigo-50 rounded-full"}>
              <HomePageSvg />
            </div>
          </div>
        </div>

        <div
          class="text-sm tooltip tooltip-bottom"
          data-tip="Get help on Slack"
        >
          <a
            href={
              "https://join.slack.com/t/openreplay/shared_invite/zt-2brqlwcis-k7OtqHkW53EAoTRqPjCmyg"
            }
            target={"_blank"}
          >
            <div class={"cursor-pointer p-2 hover:bg-indigo-50 rounded-full"}>
              <SlackSvg />
            </div>
          </a>
        </div>

        <div
          class="text-sm tooltip tooltip-bottom"
          data-tip="Settings"
          onClick={openSettings}
        >
          <div class={"cursor-pointer p-2 hover:bg-indigo-50 rounded-full"}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-cog"
            >
              <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
              <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              <path d="M12 2v2" />
              <path d="M12 22v-2" />
              <path d="m17 20.66-1-1.73" />
              <path d="M11 10.27 7 3.34" />
              <path d="m20.66 17-1.73-1" />
              <path d="m3.34 7 1.73 1" />
              <path d="M14 12h8" />
              <path d="M2 12h2" />
              <path d="m20.66 7-1.73 1" />
              <path d="m3.34 17 1.73-1" />
              <path d="m17 3.34-1 1.73" />
              <path d="m11 13.73-4 6.93" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATE = {
  empty: "empty",
  login: "login",
  ready: "ready",
  starting: "starting",
  recording: "recording",
};

function App() {
  const [state, setState] = createSignal(STATE.empty);
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);
  const [mic, setMic] = createSignal(false);
  const [selectedAudioDevice, setSelectedAudioDevice] = createSignal("");
  const [hasPermissions, setHasPermissions] = createSignal(false);
  
  onMount(() => {
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "popup:no-login") {
        setState(STATE.login);
      }
      if (message.type === "popup:login") {
        setState(STATE.ready);
      }
      if (message.type === "popup:stopped") {
        setState(STATE.ready);
      }
      if (message.type === "popup:started") {
        setState(STATE.recording);
      }
      if (message.type === "popup:mic-status") {
        setMic(message.status);
      }
    });
    void browser.runtime.sendMessage({ type: "popup:check-status" });
  });

  const startRecording = async (reqTab: "tab" | "desktop") => {
    setState(STATE.starting);
    await browser.runtime.sendMessage({
      type: "popup:start",
      area: reqTab,
      mic: mic(),
      audioId: selectedAudioDevice(),
      permissions: hasPermissions(),
    });
    window.close();
  };

  const stopRecording = () => {
    void browser.runtime.sendMessage({
      type: "popup:stop",
      mic: mic(),
      audioId: selectedAudioDevice(),
    });
  };

  const toggleMic = async () => {
    setMic(!mic());
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
  };
  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <div>
      {isSettingsOpen() ? (
        <Settings goBack={closeSettings} />
      ) : (
        <div class={"flex flex-col gap-4 p-5"}>
          <Header openSettings={openSettings} />

          {state() === STATE.login ? (
            <Login />
          ) : (
            <>
              {state() === STATE.recording ? (
                <Button
                  name={"End Recording"}
                  onClick={() => stopRecording()}
                />
              ) : null}
              {state() === STATE.starting ? (
                <div
                  class={
                    "flex flex-row items-center gap-2 w-full justify-center"
                  }
                >
                  <div class="py-4">Your recording is starting</div>
                </div>
              ) : null}
              {state() === STATE.ready ? (
                <>
                  <div class="flex flex-row items-center gap-2 w-full justify-center">
                    <button
                      class="btn bg-indigo-100  text-base hover:bg-primary hover:text-white w-6/12"
                      name="Record Tab"
                      onClick={() => startRecording("tab")}
                    >
                      <RecordTabSvg />
                      Record Tab
                    </button>

                    <button
                      class="btn bg-teal-50 text-base hover:bg-primary hover:text-white"
                      name={"Record Desktop"}
                      onClick={() => startRecording("desktop")}
                    >
                      <RecordDesktopSvg />
                      Record Desktop
                    </button>
                  </div>
                  <AudioPicker
                    mic={mic}
                    toggleMic={toggleMic}
                    selectedAudioDevice={selectedAudioDevice}
                    setSelectedAudioDevice={setSelectedAudioDevice}
                    setHasPermissions={setHasPermissions}
                  />
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface IAudioPicker {
  mic: () => boolean;
  toggleMic: () => void;
  selectedAudioDevice: () => string;
  setSelectedAudioDevice: (value: string) => void;
  setHasPermissions: (value: boolean) => void;
}
function AudioPicker(props: IAudioPicker) {
  const [audioDevices, setAudioDevices] = createSignal(
    [] as { label: string; id: string }[],
  );
  const [checkedAudioDevices, setCheckedAudioDevices] = createSignal(0);

  createEffect(() => {
    chrome.storage.local.get("audioPerm", (data) => {
      console.log('audioPerm', data.audioPerm);
      if (data.audioPerm && audioDevices().length === 0) {
        props.setHasPermissions(true);
        void checkAudioDevices();
      }
    });
  });

  const checkAudioDevices = async () => {
    const { granted, audioDevices, denied } = await getAudioDevices();
    if (!granted && !denied) {
      void browser.runtime.sendMessage({
        type: "popup:get-audio-perm",
      });
      browser.runtime.onMessage.addListener((message) => {
        if (message.type === "popup:audio-perm") {
          void checkAudioDevices();
        }
      });
    } else if (audioDevices.length > 0) {
      chrome.storage.local.set({ audioPerm: granted });
      setAudioDevices(audioDevices);
      props.setSelectedAudioDevice(audioDevices[0]?.id || "");
    }
  };
  
  const checkAudio = async () => {
    if (checkedAudioDevices() > 0) {
      return;
    }
    setCheckedAudioDevices(1);
    await checkAudioDevices();
    setCheckedAudioDevices(2);
  };
  const onSelect = (value) => {
    props.setSelectedAudioDevice(value);
    if (!props.mic()) {
      props.toggleMic();
    }
  };

  const onMicToggle = async () => {
    if (!audioDevices().length) {
      return await checkAudioDevices();
    }
    if (!props.selectedAudioDevice() && audioDevices().length) {
      onSelect(audioDevices()[0].id);
    } else {
      props.toggleMic();
    }
  };

  return (
    <div class={"inline-flex items-center gap-1 text-xs"}>
      <div
        class={
          "p-1 cursor-pointer btn btn-xs bg-white hover:bg-indigo-50 pointer-events-auto tooltip tooltip-right text-sm font-normal"
        }
        data-tip={props.mic() ? "Switch Off Mic" : "Switch On Mic"}
        onClick={onMicToggle}
      >
        <img
          src={props.mic() ? micOn : micOff}
          alt={props.mic() ? "microphone on" : "microphone off"}
          width={16}
          height={16}
        />
      </div>
      <div
        class={
          "flex items-center gap-1 btn btn-xs btn-ghost hover:bg-neutral/20 rounded-lg pointer-events-auto"
        }
        onClick={checkAudio}
      >
        {audioDevices().length === 0 ? (
          <div class="max-w-64 block leading-tight cursor-pointer whitespace-nowrap overflow-hidden font-normal">
            {checkedAudioDevices() === 1 ? 'Loading audio devices' : 'Grant microphone access'}
          </div>
        ) : (
          <Dropdown
            options={audioDevices()}
            selected={props.selectedAudioDevice()}
            onChange={onSelect}
          />
        )}
        <ChevronSvg />
      </div>
    </div>
  );
}

function ChevronSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className="lucide lucide-chevron-down"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function RecordDesktopSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className="lucide lucide-monitor-dot"
    >
      <circle cx="19" cy="6" r="3" />
      <path d="M22 12v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
    </svg>
  );
}

function RecordTabSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className="lucide lucide-app-window"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M10 4v4" />
      <path d="M2 8h20" />
      <path d="M6 4v4" />
    </svg>
  )
}

function HomePageSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-house"
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function SlackSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-circle-help"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export default App;
