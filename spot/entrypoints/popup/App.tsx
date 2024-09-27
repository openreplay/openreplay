import orLogo from "~/assets/orSpot.svg";
import micOff from "~/assets/mic-off-red.svg";
import micOn from "~/assets/mic-on-dark.svg";
import Login from "~/entrypoints/popup/Login";
import Settings from "~/entrypoints/popup/Settings";
import { createSignal, createEffect, onMount } from "solid-js";
import Dropdown from "~/entrypoints/popup/Dropdown";
import Button from "~/entrypoints/popup/Button";
import {
  ChevronSvg,
  RecordDesktopSvg,
  RecordTabSvg,
  HomePageSvg,
  SlackSvg,
  SettingsSvg,
} from "./Icons";

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
          <span class={"text-lg font-semibold text-black"}>OpenReplay Spot</span>
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
            <SettingsSvg />
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
            {checkedAudioDevices() === 1
              ? "Loading audio devices"
              : "Grant microphone access"}
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

export default App;
