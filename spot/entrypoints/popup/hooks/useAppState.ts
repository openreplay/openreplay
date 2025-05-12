import { createSignal, onMount } from "solid-js";
import { AppState, RecordingArea } from "../types";

export function useAppState() {
  const [state, setState] = createSignal<AppState>(AppState.EMPTY);
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);

  onMount(() => {
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "popup:no-login") {
        setState(AppState.LOGIN);
      }
      if (message.type === "popup:login") {
        setState(AppState.READY);
      }
      if (message.type === "popup:stopped") {
        setState(AppState.READY);
      }
      if (message.type === "popup:started") {
        setState(AppState.RECORDING);
      }
    });

    void browser.runtime.sendMessage({ type: "popup:check-status" });
  });

  const startRecording = async (
    area: RecordingArea,
    mic: boolean,
    audioId: string,
    permissions: boolean
  ) => {
    setState(AppState.STARTING);
    await browser.runtime.sendMessage({
      type: "popup:start",
      area,
      mic,
      audioId,
      permissions,
    });
    window.close();
  };

  const stopRecording = (mic: boolean, audioId: string) => {
    void browser.runtime.sendMessage({
      type: "popup:stop",
      mic,
      audioId,
    });
  };

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  return {
    state,
    isSettingsOpen,
    startRecording,
    stopRecording,
    openSettings,
    closeSettings,
  };
}
