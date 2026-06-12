import { createSignal, createEffect } from "solid-js";
import { AudioDevice } from "../types";
import { getAudioDevices } from "../utils/audio";
import { onMessage, sendMessage } from "~/utils/messaging";
import {
  audioPermStore,
  selectedAudioIdStore,
  micOnStore,
} from "~/utils/storage";

export function useAudioDevices() {
  const [audioDevices, setAudioDevices] = createSignal<AudioDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = createSignal("");
  const [mic, setMic] = createSignal(false);
  const [hasPermissions, setHasPermissions] = createSignal(false);
  const [isChecking, setIsChecking] = createSignal(false);

  createEffect(() => {
    void (async () => {
      const audioPerm = await audioPermStore.getValue();
      if (!audioPerm || audioDevices().length !== 0) return;
      setHasPermissions(true);
      const devices = await checkAudioDevices();
      const [selectedAudioId, micOn] = await Promise.all([
        selectedAudioIdStore.getValue(),
        micOnStore.getValue(),
      ]);
      if (selectedAudioId) {
        const selectedDevice = devices.find((d) => d.id === selectedAudioId);
        if (selectedDevice) setSelectedAudioDevice(selectedDevice.id);
      }
      if (micOn) toggleMic();
    })();
  });

  const checkAudioDevices = async (): Promise<AudioDevice[]> => {
    setIsChecking(true);

    const { granted, audioDevices, denied } = await getAudioDevices();

    if (!granted && !denied) {
      void sendMessage("popup:get-audio-perm").catch(() => {});
      onMessage("popup:audio-perm", () => {
        void checkAudioDevices();
      });
    } else if (audioDevices.length > 0 && selectedAudioDevice() === "") {
      void audioPermStore.setValue(granted);
      setAudioDevices(audioDevices);
      setSelectedAudioDevice(audioDevices[0]?.id || "");
    }

    setIsChecking(false);
    return audioDevices;
  };

  const toggleMic = () => {
    setMic(!mic());
  };

  const selectAudioDevice = (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    if (!mic()) {
      toggleMic();
    }
    void selectedAudioIdStore.setValue(deviceId);
    void micOnStore.setValue(true);
  };

  const handleMicToggle = async () => {
    if (!audioDevices().length) {
      return await checkAudioDevices();
    }

    if (!selectedAudioDevice() && audioDevices().length) {
      selectAudioDevice(audioDevices()[0].id);
    } else {
      void micOnStore.setValue(!mic());
      toggleMic();
    }
  };

  return {
    audioDevices,
    selectedAudioDevice,
    mic,
    setMic,
    hasPermissions,
    isChecking,
    checkAudioDevices,
    toggleMic,
    selectAudioDevice,
    handleMicToggle,
  };
}
