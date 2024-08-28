async function requestMicrophoneAccess() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    void chrome.runtime.sendMessage({ type: "audio:audio-perm" });
    void chrome.storage.local.set({ audioPerm: true });
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