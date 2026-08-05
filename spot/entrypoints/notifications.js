import { pageMessages } from "~/utils/pageMessages";

export default defineUnlistedScript(() => {
  const { notifications } = pageMessages;
  async function copyToTheClipboard(textToCopy) {
    const el = document.createElement("textarea");
    el.value = textToCopy;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }

  function injectCSS() {
    const cssText = `
    .or-flex{display:flex}
    .or-items-center {align-items:center}
    .or-gap-3 {gap: .25rem}
    .or-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top-color: #394dfe;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `;
    const styleEl = document.createElement("style");
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);
  }

  function createNotification(event) {
    const message = event.data.message || "Recording has started successfully.";

    // Built as nodes, never interpolated HTML: the message text arrives over
    // window.postMessage and must not be able to inject markup into the page.
    const row = document.createElement("div");
    row.className = "or-flex or-gap-3 or-items-center";
    const spinner = document.createElement("div");
    spinner.className = "or-spinner";
    const label = document.createElement("span");
    label.textContent = String(message);
    row.appendChild(spinner);
    row.appendChild(label);

    const notification = document.createElement("div");

    const styles = {
      position: "fixed",
      bottom: "2rem",
      right: "2rem",
      backgroundColor: "#E2E4F6",
      color: "black",
      padding: "1.5rem",
      borderRadius: "0.75rem",
      opacity: "0.9",
      transition: "opacity 300ms",
      zIndex: 99999999,
    };

    Object.assign(notification.style, styles);
    notification.appendChild(row);
    document.body.appendChild(notification);

    notification.offsetHeight;

    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 4500);
  }

  function initNotificationListener() {
    function handleMessage(event) {
      // Only the content script in this same window posts these.
      if (event.source !== window) return;
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === notifications.display) {
        createNotification(event);
      }
      if (event.data.type === notifications.copy) {
        copyToTheClipboard(event.data.url)
          .then(() => {
            createNotification({
              data: { message: 'Link copied to clipboard and new tab opened' }
            });
          })
          .catch((e) => {
            console.error(e);
          });
      }
      if (event.data.type === notifications.stop) {
        window.removeEventListener("message", handleMessage);
      }
    }

    window.addEventListener("message", handleMessage);

    return function cleanup() {
      window.removeEventListener("message", handleMessage);
    };
  }

  injectCSS();
  if (!window.__or_clear_notifications) {
    window.__or_clear_notifications = initNotificationListener();
  }
});
