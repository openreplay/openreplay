import { createSignal, createEffect } from "solid-js";
import { AudioDevice } from "../types";
import { getAudioDevices } from "../utils/audio";

export function useAudioDevices() {
  const [audioDevices, setAudioDevices] = createSignal<AudioDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = createSignal("");
  const [mic, setMic] = createSignal(false);
  const [hasPermissions, setHasPermissions] = createSignal(false);
  const [isChecking, setIsChecking] = createSignal(false);

  createEffect(() => {
    chrome.storage.local.get("audioPerm", (data) => {
      if (data.audioPerm && audioDevices().length === 0) {
        setHasPermissions(true);
        checkAudioDevices().then(async (devices) => {
          const { selectedAudioId, micOn } = await chrome.storage.local.get([
            "selectedAudioId",
            "micOn",
          ]);

          if (selectedAudioId) {
            const selectedDevice = devices.find(
              (device) => device.id === selectedAudioId
            );
            if (selectedDevice) {
              setSelectedAudioDevice(selectedDevice.id);
            }
          }

          if (micOn) {
            toggleMic();
          }
        });
      }
    });
  });

  const checkAudioDevices = async (): Promise<AudioDevice[]> => {
    setIsChecking(true);

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
    } else if (audioDevices.length > 0 && selectedAudioDevice() === "") {
      chrome.storage.local.set({ audioPerm: granted });
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
    chrome.storage.local.set({ selectedAudioId: deviceId, micOn: true });
  };

  const handleMicToggle = async () => {
    if (!audioDevices().length) {
      return await checkAudioDevices();
    }

    if (!selectedAudioDevice() && audioDevices().length) {
      selectAudioDevice(audioDevices()[0].id);
    } else {
      chrome.storage.local.set({ micOn: !mic() });
      toggleMic();
    }
  };

  return {
    audioDevices,
    selectedAudioDevice,
    mic,
    hasPermissions,
    isChecking,
    checkAudioDevices,
    toggleMic,
    selectAudioDevice,
    handleMicToggle,
  };
}
