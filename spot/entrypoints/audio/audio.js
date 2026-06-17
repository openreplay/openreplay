import { sendMessage } from "~/utils/messaging";
import { audioPermStore } from "~/utils/storage";

async function requestMicrophoneAccess() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    void sendMessage("audio:audio-perm").catch(() => {});
    void audioPermStore.setValue(true);
    stream.getTracks().forEach((track) => track.stop());
    window.close();
  } catch (error) {
    alert(
      "Permission denied or device not found. The extension may not work as expected.",
    );
    console.error("Error requesting audio permission:", error);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  void requestMicrophoneAccess();
});