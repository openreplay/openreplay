import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-solid"],
  manifest: {
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    host_permissions: ["<all_urls>"],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
      sandbox:
        "sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; child-src 'self';",
    },
    web_accessible_resources: [
      {
        resources: ["injected.js", "notifications.js"],
        matches: ["<all_urls>"],
      },
    ],
    permissions: [
      "storage",
      "tabCapture",
      "offscreen",
      "unlimitedStorage",
      "webNavigation",
    ],
  },
});
