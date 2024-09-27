import { startNetwork, stopNetwork } from "~/utils/proxyNetworkTracking";
import { patchConsole } from "~/utils/consoleTracking";

export default defineUnlistedScript(() => {
  window.addEventListener("message", (event) => {
    if (event.data.type === "injected:start") {
      if (!window.__or_revokeSpotPatch) {
        startNetwork();
        window.__or_revokeSpotPatch = patchConsole(console, window);
      }
    }
    if (event.data.type === "injected:stop") {
      if (window.__or_revokeSpotPatch) {
        window.__or_revokeSpotPatch();
        window.__or_revokeSpotPatch = null;
        stopNetwork();
      }
    }
  });
});
