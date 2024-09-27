import { startNetwork, stopNetwork } from "~/utils/proxyNetworkTracking";
import { patchConsole } from "~/utils/consoleTracking";

export default defineUnlistedScript(() => {
  window.addEventListener("message", (event) => {
    if (event.data.type === "injected:c-start") {
      if (!window.__or_revokeSpotPatch) {
        window.__or_revokeSpotPatch = patchConsole(console, window);
      }
    }
    if (event.data.type === "injected:n-start") {
      startNetwork();
    }
    if (event.data.type === "injected:n-stop") {
      stopNetwork();
    }
    if (event.data.type === "injected:c-stop") {
      if (window.__or_revokeSpotPatch) {
        window.__or_revokeSpotPatch();
        window.__or_revokeSpotPatch = null;
      }
    }
  });
});
