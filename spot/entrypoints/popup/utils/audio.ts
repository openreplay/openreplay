import type { AudioDevice } from "../types";
export async function getAudioDevices(): Promise<{
  granted: boolean;
  denied?: boolean;
  audioDevices: AudioDevice[];
}> {
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
