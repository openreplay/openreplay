export default defineUnlistedScript(() => {
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

    const notificationContent = `
    <div class="or-flex or-gap-3 or-items-center">
      <div class="or-spinner"></div>
      <span>${message}</span>
     </div>
    `;

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
    notification.innerHTML = notificationContent;
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
      if (event.data.type === "ornotif:display") {
        createNotification(event);
      }
      if (event.data.type === "ornotif:copy") {
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
      if (event.data.type === "ornotif:stop") {
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
