import { startNetwork, stopNetwork } from "~/utils/proxyNetworkTracking";
import { patchConsole } from "~/utils/consoleTracking";
import { pageMessages } from "~/utils/pageMessages";

export default defineUnlistedScript(() => {
  const { injected } = pageMessages;
  window.addEventListener("message", (event) => {
    // Only the content script in this same window drives capture on/off.
    if (event.source !== window) return;
    if (!event.data || typeof event.data !== "object") return;
    if (event.data.type === injected.consoleStart) {
      if (!window.__or_revokeSpotPatch) {
        window.__or_revokeSpotPatch = patchConsole(console, window);
      }
    }
    if (event.data.type === injected.networkStart) {
      startNetwork();
    }
    if (event.data.type === injected.networkStop) {
      stopNetwork();
    }
    if (event.data.type === injected.consoleStop) {
      if (window.__or_revokeSpotPatch) {
        window.__or_revokeSpotPatch();
        window.__or_revokeSpotPatch = null;
      }
    }
  });
});
