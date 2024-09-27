import { createSignal, onCleanup, createEffect } from "solid-js";
import { STATES, formatMsToTime } from "~/entrypoints/content/utils";
import micOn from "~/assets/mic-on.svg";
import { createDraggable } from "@neodrag/solid";

interface IRControls {
  pause: () => void;
  resume: () => void;
  stop: () => Promise<any>;
  changeState: (newState: keyof typeof STATES) => void;
  getMicStatus: () => Promise<any>;
  getClockStart: () => number;
  mute: () => void;
  unmute: () => void;
  getInitState: () => string;
  onRestart: () => void;
  getAudioPerm: () => number;
}

function RecordingControls({
  pause,
  resume,
  stop,
  changeState,
  getMicStatus,
  getClockStart,
  mute,
  unmute,
  getInitState,
  onRestart,
  getAudioPerm,
}: IRControls) {
  const { draggable } = createDraggable();

  const initState = getInitState();
  const [isLoading, setIsLoading] = createSignal(false);
  const [mic, setMic] = createSignal(false);
  const [recording, setRecording] = createSignal(initState === "recording");
  const [time, setTime] = createSignal(0);
  const [timeStr, setTimeStr] = createSignal(formatMsToTime(0));

  const onMsg = (e: any) => {
    if (e.data.type === "content:trigger-stop") {
      void onEnd();
    }
  };
  createEffect(() => {
    window.addEventListener("message", onMsg);
    const startDelta = getClockStart();
    setTime(startDelta);
    setTimeStr(formatMsToTime(startDelta));
    getMicStatus().then((status) => {
      setMic(status);
    });
  });
  const createTimer = () => {
    return setInterval(() => {
      const timeDelta = time() + 1000;
      if (timeDelta > 3 * 60 * 1000) {
        void onEnd();
        return;
      } else {
        setTime((time) => {
          const newTime = time + 1000;
          const newTimeStr = formatMsToTime(newTime);
          setTimeStr(newTimeStr);
          return newTime;
        });
      }
    }, 1000);
  };
  let timer: ReturnType<typeof setInterval> | null =
    initState === "recording" ? createTimer() : null;
  onCleanup(() => {
    if (timer) {
      clearInterval(timer);
    }
    window.removeEventListener("message", onMsg);
  });

  const onPause = () => {
    if (timer) {
      clearInterval(timer);
    }
    timer = null;
    pause();
    setRecording(false);
  };

  const onRestartEv = () => {
    onPause();
    onRestart();
  };

  const onResume = () => {
    timer = createTimer();
    resume();
    setRecording(true);
  };

  const onEnd = async () => {
    setIsLoading(true);
    if (timer) {
      clearInterval(timer);
    }
    try {
      await stop();
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => {
      changeState(STATES.saving);
    }, 25);
  };

  const toggleMic = async () => {
    if (mic()) {
      mute();
    } else {
      unmute();
    }
    const status = await getMicStatus();
    setMic(status);
  };

  let handleRef: HTMLDivElement;
  setTimeout(() => {
    handleRef.classList.remove("popupanimated");
  }, 250);

  const audioPerm = getAudioPerm();
  return (
    <div
      class={"rec-controls popupanimated cursor-grab"}
      use:draggable={{ bounds: "body" }}
      ref={(el) => (handleRef = el)}
    >
      {!isLoading() ? (
        <div
          class={
            "flex flex-row w-fit gap-2 items-center bg-black/70 px-4 py-2 rounded-full text-white"
          }
        >
          {recording() ? (
            <button
              class={
                "btn btn-sm btn-ghost btn-circle tooltip tooltip-top flex items-center bg-black/20 hover:bg-black/70"
              }
              data-tip="Pause Recording"
              onClick={onPause}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-pause"
              >
                <rect x="14" y="4" width="4" height="16" rx="1" />
                <rect x="6" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              class={
                "btn btn-sm btn-ghost btn-circle tooltip tooltip-top flex items-center bg-black/70 hover:bg-black"
              }
              data-tip="Resume Recording"
              onClick={onResume}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-play"
              >
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </button>
          )}

          <div class="divider hidden"></div>

          <div
            class={"timerarea text-base cursor-default p-1 rounded-xl bg-black"}
          >
            {timeStr()}
          </div>

          <button
            class={`btn btn-sm btn-circle btn-ghost tooltip tooltip-top flex items-center ${
              mic() ? "bg-black/20" : "bg-black"
            }`}
            data-tip={
              audioPerm > 0
                ? mic()
                  ? "Switch Off Mic"
                  : "Switch On Mic"
                : "Microphone disabled"
            }
            onClick={audioPerm > 0 ? toggleMic : undefined}
          >
            {mic() ? (
              <img src={micOn} />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-mic-off"
              >
                <line x1="2" x2="22" y1="2" y2="22" />
                <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                <path d="M5 10v2a7 7 0 0 0 12 5" />
                <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            )}
          </button>

          <div class="divider hidden"></div>

          <button
            class={
              "btn btn-sm btn-ghost btn-circle tooltip tooltip-top flex items-center bg-red-600  hover:bg-red-700 "
            }
            data-tip="End Recording"
            onClick={onEnd}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-square"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
            </svg>
          </button>

          <button
            class={
              "btn btn-sm btn-ghost btn-circle tooltip tooltip-top flex items-center bg-black/20 hover:bg-black/70"
            }
            data-tip="Restart Recording"
            onClick={onRestartEv}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-refresh-cw"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
              <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
            </svg>
          </button>
        </div>
      ) : (
        <div class={"container"}>Loading video... </div>
      )}
    </div>
  );
}

export default RecordingControls;
