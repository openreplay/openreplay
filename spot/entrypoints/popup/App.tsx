import { onMount } from "solid-js";
import Login from "~/entrypoints/popup/Login";
import Settings from "~/entrypoints/popup/Settings";
import Header from "./components/Header";
import RecordingControls from "./components/RecordingControls";
import AudioPicker from "./components/AudioPicker";
import { useAppState } from "./hooks/useAppState";
import { useAudioDevices } from "./hooks/useAudioDevices";
import { AppState } from "./types";
import { onMessage } from "~/utils/messaging";

function App() {
  const {
    state,
    isSettingsOpen,
    startRecording,
    stopRecording,
    openSettings,
    closeSettings,
  } = useAppState();

  const {
    audioDevices,
    selectedAudioDevice,
    mic,
    setMic,
    hasPermissions,
    isChecking,
    checkAudioDevices,
    handleMicToggle,
    selectAudioDevice,
  } = useAudioDevices();

  onMount(() => {
    onMessage("popup:mic-status", ({ data }) => {
      setMic(data.status);
    });
  });

  const handleStartRecording = (area: "tab" | "desktop") => {
    startRecording(area, mic(), selectedAudioDevice(), hasPermissions());
  };

  const handleStopRecording = () => {
    stopRecording(mic(), selectedAudioDevice());
  };

  return (
    <div>
      {isSettingsOpen() ? (
        <Settings goBack={closeSettings} />
      ) : (
        <div class="flex flex-col gap-4 p-5">
          <Header openSettings={openSettings} />

          {state() === AppState.LOGIN ? (
            <Login />
          ) : (
            <>
              <RecordingControls
                state={state()}
                startRecording={handleStartRecording}
                stopRecording={handleStopRecording}
              />

              {state() === AppState.READY && (
                <AudioPicker
                  mic={mic}
                  audioDevices={audioDevices}
                  selectedAudioDevice={selectedAudioDevice}
                  isChecking={isChecking}
                  onMicToggle={handleMicToggle}
                  onCheckAudio={checkAudioDevices}
                  onSelectDevice={selectAudioDevice}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
