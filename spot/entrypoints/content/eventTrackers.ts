import { onCLS, onINP, onLCP, Metric } from "web-vitals";
import { sendMessage } from "~/utils/messaging";

export const clicksArray: { time: number; label: string }[] = [];
export let clickInt: ReturnType<typeof setInterval> | null = null;
export let locationInt: ReturnType<typeof setInterval> | null = null;
let vitalsSet = false;

export function startLocationRecording() {
  let currentLocation = location.href;
  const sendLocation = (msg: any) => {
    void sendMessage("ort:bump-location", { location: msg }).catch(() => {});
  };

  const checkVitals = (val: Metric) => {
    if (locationInt !== null) {
      // #1: send under the `vitals` key the background actually reads.
      void sendMessage("ort:bump-vitals", { vitals: val }).catch(() => {});
    }
  };

  if (!vitalsSet) {
    onCLS(checkVitals);
    onINP(checkVitals);
    onLCP(checkVitals);
    vitalsSet = true;
  }

  const grabNavTimingData = () => {
    const navTiming = performance.getEntriesByType("navigation");
    return {
      fcpTime: navTiming[0].domContentLoadedEventEnd,
      visuallyComplete: navTiming[0].domComplete,
      timeToInteractive: navTiming[0].domInteractive,
    };
  };
  const initMsg = {
    time: Date.now(),
    location: location.href,
    navTiming: grabNavTimingData(),
  };
  sendLocation(initMsg);
  locationInt = setInterval(() => {
    const newLocation = location.href;
    if (currentLocation !== newLocation) {
      const newMsg = {
        time: Date.now(),
        location: newLocation,
        navTiming: grabNavTimingData(),
      };
      sendLocation(newMsg);
      currentLocation = newLocation;
    }
  }, 1000);
}

export function stopLocationRecording() {
  if (locationInt) {
    clearInterval(locationInt);
    locationInt = null;
  }
}

export function trackClick(e: any) {
  const parentShadowRoot = document.querySelector("spot-ui");
  // ignore clicks inside ctx shadowRoot
  if (e.target && parentShadowRoot?.contains(e.target)) {
    return;
  }
  const clickObj = {
    time: Date.now(),
    label: e.target?.tagName || "unknown",
  };
  if (e.target && e.target.tagName !== "INPUT") {
    clickObj.label = e.target.innerText || e.target.tagName;
  }
  clicksArray.push(clickObj);
}
export function startClickRecording() {
  clicksArray.length = 0;
  document.addEventListener("click", trackClick);
  // The 1s cadence doubles as the service-worker keep-alive during recording:
  // an inbound message every second resets the MV3 idle timer (#6).
  clickInt = setInterval(() => {
    void sendMessage("ort:bump-clicks", { clicks: clicksArray.concat([]) }).catch(
      () => {},
    );
    clicksArray.length = 0;
  }, 1000);
}
export function stopClickRecording() {
  document.removeEventListener("click", trackClick);
  if (clickInt) {
    clearInterval(clickInt);
    clickInt = null;
  }
}
