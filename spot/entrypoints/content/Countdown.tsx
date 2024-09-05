import { createSignal, onCleanup, onMount } from "solid-js";

function Countdown(props: {
  onEnd: (proceed?: boolean) => void;
  getAudioPerm: () => 0 | 1 | 2;
}) {
  const [count, setCount] = createSignal(3);

  let interval: any;

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      clearInterval(interval);
      props.onEnd(false);
    }
  };

  onMount(() => {
    interval = setInterval(() => {
      setCount((prev) => {
        if (prev === 0) {
          clearInterval(interval);
          props.onEnd(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    window.addEventListener("keydown", escHandler);
  });

  onCleanup(() => {
    clearInterval(interval);
    window.removeEventListener("keydown", escHandler);
  });

  const audioPerm = props.getAudioPerm();

  const audioPrompt = {
    0: "Microphone permission isn't granted yet.",
    1: "Microphone access is enabled. Unmute anytime to add voice over.",
    2: "Microphone is enabled.",
  };

  return (
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="flex flex-col gap-2 items-center px-4 py-2 text-white mb-2">
          <div class="text-3xl text-white font-bold rounded-full w-16 h-16 flex items-center justify-center relative z-20">
            <span class="z-30">{count()}</span>

            <div class="absolute top-0 left-0 z-10">
              <svg
                width="64"
                height="64"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="rgba(0, 0, 0, 0.3)"
                  stroke="rgba(255,255,255,.4)"
                  stroke-width="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="rgba(255,255,255,.3)"
                  stroke="rgba(255, 255, 255, 0.3)"
                  stroke-width="10"
                  stroke-dasharray="283"
                  stroke-dashoffset="0"
                >
                  {count() > 0 && (
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;283"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
              </svg>
            </div>
          </div>
          <div class="flex flex-col justify-between items-center gap-2 mt-2">
            <span class="text-2xl font-medium">Get Ready to Record...</span>
            <span class="text-base text-white/70 flex gap-2 items-center">
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
                class="lucide lucide-mic"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>{" "}
              {audioPrompt[audioPerm]}
            </span>
            <span class="text-base text-white/70 flex gap-2 items-center">
              <span class="px-1 rounded-lg bg-white/30 text-inherit">ESC</span>{" "}
              to cancel.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Countdown;
