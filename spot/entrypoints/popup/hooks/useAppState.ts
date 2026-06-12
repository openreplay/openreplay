import { createSignal, onMount } from "solid-js";
import { AppState, RecordingArea } from "../types";
import { onMessage, sendMessage } from "~/utils/messaging";

export function useAppState() {
  const [state, setState] = createSignal<AppState>(AppState.LOGIN);
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);

  onMount(() => {
    onMessage("popup:no-login", () => {
      setState(AppState.LOGIN);
    });
    onMessage("popup:login", () => {
      setState(AppState.READY);
    });
    onMessage("popup:stopped", () => {
      setState(AppState.READY);
    });
    onMessage("popup:started", () => {
      setState(AppState.RECORDING);
    });

    void sendMessage("popup:check-status").catch(() => {});
  });

  const startRecording = async (
    area: RecordingArea,
    mic: boolean,
    audioId: string,
    permissions: boolean
  ) => {
    setState(AppState.STARTING);
    await sendMessage("popup:start", { area, mic, audioId, permissions }).catch(
      () => {},
    );
    window.close();
  };

  const stopRecording = (mic: boolean, audioId: string) => {
    void sendMessage("popup:stop", { mic, audioId }).catch(() => {});
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
