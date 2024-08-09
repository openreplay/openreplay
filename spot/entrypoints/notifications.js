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
      #or-notification{
        font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      }
      .or-flex {
        display:flex;
      }
      .or-items-center{
        align-items: center;
      }
      .or-gap-3{
        gap: 0.25rem;
      }
      .or-checkbox {
        appearance: none;
        width: 1.5rem;
        height: 1.5rem;
        background-color: #FFFFFF;
        border: 1px solid #394dfe;
        border-radius: 2rem;
        display: inline-block;
        position: relative;
        cursor: pointer;
      }
      .or-checkbox:checked {
        background-color: #394dfe;
        border: 1px solid #394dfe;
      }
      .or-checkbox:checked::after {
        content: '';
        position: absolute;
        top: 45%;
        left: 50%;
        width: 0.4rem;
        height: 0.8rem;
        border: solid #FFFFFF;
        border-width: 0 3px 3px 0;
        border-radius: .1rem;
        transform: translate(-50%, -50%) rotate(45deg);
      }
      .or-mb-3{
        margin-bottom: 0.75rem 
      }
      .or-mb-5{
        margin-bottom: 1.25rem 
      }
      .or-ms-1{
        margin-inline-start: 0.25rem;
      }
      .or-progress-bar-container {
        width: 100%;
        height: 3px;
        background-color: #f3f3f3;
        overflow: hidden;
        position: relative;
      }
      .or-progress-bar {
        width: 100%;
        height: 100%;
        background-color: #394dfe;
        position: absolute;
        animation: or-loading .5s infinite;
      }
      @keyframes or-loading {
        0% {
          left: -100%;
          width: 0%;
        }
        50% {
          left: 25%;
          width: 50%;
        }
        100% {
          left: 100%;
          width: 0%;
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
      <div id="or-notification">
        <div class="or-progress-bar-container or-mb-5">
          <div class="or-progress-bar"></div>
        </div>
        <div id="or-item1" class="or-flex or-items-center or-mb-3 or-gap-3">
          <input type="checkbox" id="or-checkbox1" class="or-checkbox">
          <span>Save Spot</span>
        </div>
        <div id="or-item2" class="or-flex or-items-center or-mb-3 or-gap-3">
          <input type="checkbox" id="or-checkbox2" class="or-checkbox">
          <span>Open Spot in new tab</span>
        </div>
        <div id="or-item3" class="or-flex or-items-center or-mb-3 or-gap-3">
          <input type="checkbox" id="or-checkbox3" class="or-checkbox">
          <span>${message}</span>
        </div>
        
        
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

    // Force reflow to ensure styles are applied
    notification.offsetHeight; // Trigger reflow

    // Update the checkboxes based on the events
    function updateCheckbox(itemId, checkboxId, delay) {
      setTimeout(() => {
        document.getElementById(checkboxId).checked = true;
      }, delay);
    }

    const items = [
      { itemId: 'or-item1', checkboxId: 'or-checkbox1', delay: 1000 },
      { itemId: 'or-item2', checkboxId: 'or-checkbox2', delay: 2000 },
      { itemId: 'or-item3', checkboxId: 'or-checkbox3', delay: 3000 }
    ];

    items.forEach(item => {
      updateCheckbox(item.itemId, item.checkboxId, item.delay);
    });

    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 4000);
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
              data: { message: 'URL copied to clipboard' }
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
