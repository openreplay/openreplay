// noinspection SpellCheckingInspection

import { createSignal, onCleanup, createEffect } from "solid-js";
import { formatMsToTime } from "~/entrypoints/content/utils";
import "./style.css";
import "./dragControls.css";

interface ISavingControls {
  onClose: (
    save: boolean,
    obj?: {
      blob?: Blob;
      name?: string;
      comment?: string;
      useHook?: boolean;
      thumbnail?: string;
      crop: [number, number] | null;
    },
  ) => void;
  getVideoData: () => Promise<any>;
  getErrorEvents: () => Promise<{ title: string; time: number }[]>;
}

const base64ToBlob = (base64: string) => {
  const splitStr = base64.split(",");
  const len = splitStr.length;
  const byteString = atob(splitStr[len - 1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: "video/webm" });
};

function SavingControls({
  onClose,
  getVideoData,
  getErrorEvents,
}: ISavingControls) {
  const [name, setName] = createSignal(`Issues in — ${document.title}`);
  const [description, setDescription] = createSignal("");
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(0);
  const [playing, setPlaying] = createSignal(false);
  const [trimBounds, setTrimBounds] = createSignal([0, 0]);
  const [videoData, setVideoData] = createSignal<string | undefined>(undefined);
  const [videoBlob, setVideoBlob] = createSignal<Blob | undefined>(undefined);
  const [processing, setProcessing] = createSignal(false);
  const [startPos, setStartPos] = createSignal(0);
  const [endPos, setEndPos] = createSignal(100);
  const [dragging, setDragging] = createSignal<string | null>(null);
  const [isTyping, setIsTyping] = createSignal(false);
  const [errorEvents, setErrorEvents] = createSignal<
    { title: string; time: number }[]
  >([]);

  createEffect(() => {
    setTrimBounds([0, 0]);
    getErrorEvents().then((r) => {
      setErrorEvents(r);
    });
  });

  const spacePressed = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      isTyping()
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.key === " ") {
      if (playing()) {
        pause();
      } else {
        resume();
      }
    }
  };

  createEffect(() => {
    window.addEventListener("keydown", spacePressed);
    onCleanup(() => window.removeEventListener("keydown", spacePressed));
  });

  const convertToPercentage = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const x = clientX - rect.left;
    return (x / rect.width) * 100;
  };

  const startDrag =
    (marker: "start" | "end" | "body") => (event: MouseEvent) => {
      event.stopPropagation();
      setDragging(marker);
    };

  const onDrag = (event: MouseEvent) => {
    if (dragging() && event.clientX !== 0) {
      const newPos = convertToPercentage(
        event.clientX,
        event.currentTarget as HTMLElement,
      );
      if (dragging() === "start") {
        if (endPos() - newPos <= 1 || newPos < 0 || newPos > 100) {
          return;
        }
        setStartPos(newPos);
      } else if (dragging() === "end") {
        if (newPos - startPos() <= 1 || newPos < 0 || newPos > 100) {
          return;
        }
        setEndPos(newPos);
      }
      onTrimChange(
        (startPos() / 100) * duration(),
        (endPos() / 100) * duration(),
      );
    }
  };

  const endDrag = () => {
    setDragging(null);
  };

  onCleanup(() => {
    setDragging(null);
  });
  if (videoData() === undefined) {
    getVideoData().then(async (data: Record<string, any>) => {
      const fullData = data.base64data.join("");
      const blob = base64ToBlob(fullData);
      const blobUrl = URL.createObjectURL(blob);
      setVideoBlob(blob);
      setVideoData(blobUrl);
    });
  }

  let videoRef: HTMLVideoElement;

  const onSave = async () => {
    if (!name()) {
      return;
    }
    setProcessing(true);
    const thumbnail = await generateThumbnail();
    setProcessing(false);
    const bounds = trimBounds();
    const trim =
      bounds[0] + bounds[1] === 0
        ? null
        : [Math.floor(bounds[0] * 1000), Math.ceil(bounds[1] * 1000)];
    const dataObj = {
      blob: videoBlob(),
      name: name(),
      comment: description(),
      useHook: false,
      thumbnail,
      crop: trim,
    };
    onClose(true, dataObj);
  };

  const onCancel = () => {
    onClose(false);
  };

  const pause = () => {
    videoRef.pause();
    setPlaying(false);
  };

  const resume = () => {
    void videoRef.play();
    setPlaying(true);
  };

  const updateCurrentTime = () => {
    setCurrentTime(videoRef.currentTime);
  };

  const generateThumbnail = async (): Promise<string> => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return "";
    let thumbnailRes = "";
    const aspectRatio = videoRef.videoWidth / videoRef.videoHeight;
    const width = 1080;
    const height = width / aspectRatio;
    canvas.width = width;
    canvas.height = height;

    videoRef.currentTime = duration() ? duration() : 3;
    context.drawImage(videoRef, 0, 0, canvas.width, canvas.height);
    thumbnailRes = canvas.toDataURL("image/jpeg", 0.7);

    return new Promise((res) => {
      const interval = setInterval(() => {
        if (thumbnailRes) {
          clearInterval(interval);
          res(thumbnailRes);
        }
      }, 100);
    });
  };

  const getDuration = async () => {
    videoRef.currentTime = 1e101;
    await new Promise((resolve) => {
      videoRef.ontimeupdate = () => {
        videoRef.ontimeupdate = null;
        resolve(videoRef.duration);
      };
    });
    setTimeout(() => {
      videoRef.currentTime = 0;
    }, 25);
    return videoRef.duration;
  };

  const onMetaLoad = async () => {
    let videoDuration = videoRef.duration;
    if (videoDuration === Infinity || Number.isNaN(videoDuration)) {
      videoDuration = await getDuration();
    }
    setDuration(videoDuration);
    setErrorEvents(
      errorEvents().filter((ev: { time: number }) => ev.time < videoDuration),
    );
    void generateThumbnail();
  };

  const onVideoEnd = () => {
    setPlaying(false);
  };

  const setVideoRef = (el: HTMLVideoElement) => {
    videoRef = el;
    videoRef.addEventListener("loadedmetadata", onMetaLoad);
    videoRef.addEventListener("ended", onVideoEnd);
  };

  const round = (num: number) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  const onTrimChange = (a: number, b: number) => {
    const start = round(a);
    const end = round(b);
    setTrimBounds([start, end]);
  };

  const getTrimDuration = () => {
    const [trimStart, trimEnd] = trimBounds();
    return trimEnd - trimStart;
  };

  const pageUrl = document.location.href;

  let dialogRef: HTMLDialogElement;

  createEffect(() => {
    if (dialogRef) {
      dialogRef.showModal();
    }
  });

  const safeUrl = pageUrl.length > 60 ? pageUrl.slice(0, 60) + "..." : pageUrl;

  const int = setInterval(() => {
    updateCurrentTime();
  }, 100);

  onCleanup(() => {
    clearInterval(int);
    videoRef.removeEventListener("loadedmetadata", onMetaLoad);
    videoRef.removeEventListener("ended", onVideoEnd);
  });

  return (
    <dialog
      ref={(el) => (dialogRef = el)}
      id="editRecording"
      class="modal save-controls"
    >
      <div class="modal-box bg-slate-50 p-0 max-w-[82%]">
        <div class={"savingcontainer flex xl:flex-row flex-col"}>
          {processing() ? (
            <div class={"processingloader"}>
              <div class="flex flex-col gap-2 justify-center items-center">
                <span class="loading loading-spinner text-primary text-center justify-center items-center"></span>
                Saving...
              </div>
            </div>
          ) : null}
          <div class={"replayarea flex-1 p-4 join join-vertical"}>
            <div
              class={
                "card join-item border-t border-r border-l border-slate-100	"
              }
            >
              <div
                class={
                  "urlcontainer text-sm p-2 text-neutral/70 flex gap-1 items-center overflow-hidden"
                }
              >
                <span>
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
                    class="lucide lucide-link-2"
                  >
                    <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                    <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                    <line x1="8" x2="16" y1="12" y2="12" />
                  </svg>
                </span>
                {safeUrl}
              </div>
              <video
                ref={setVideoRef}
                class={"videocontainer"}
                src={videoData()}
              />
            </div>
            <div class={"card py-1 px-2"}>
              {errorEvents().length ? (
                <div class={"relative w-full h-4"} />
              ) : null}
              <div class={"flex items-center gap-2"}>
                <div
                  class={`${playing() ? "" : "bg-indigo-100"} cursor-pointer btn btn-ghost btn-circle btn-sm hover:bg-indigo-50 border border-slate-100`}
                >
                  {playing() ? (
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        pause();
                      }}
                      class={"pause-icon w-5"}
                    />
                  ) : (
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        resume();
                      }}
                      class={"play-icon ml-0.5 w-5"}
                    />
                  )}
                </div>

                <div class="flex flex-1 items-center gap-4">
                  <div class="w-11 text-sm font-medium">
                    {formatMsToTime(currentTime() * 1000)}
                  </div>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "21px",
                    }}
                    onMouseMove={onDrag}
                    onMouseUp={endDrag}
                  >
                    <div class={"absolute h-4 w-full"} style="top:-20px;">
                      {errorEvents().map((e) => (
                        <div
                          class={
                            "w-3 h-3 rounded-full bg-red-600 absolute tooltip"
                          }
                          style={{
                            top: "2px",
                            left: `${(e.time / duration()) * 100}%`,
                          }}
                          data-tip={e.title}
                        />
                      ))}
                    </div>
                    <div
                      class="marker start"
                      onMouseDown={startDrag("start")}
                      style={{ left: `calc(${startPos()}% - 1.4%)` }}
                    >
                      <div class="handle"></div>
                      <div class="handle"></div>
                    </div>
                    <div
                      class="slider-body"
                      // onMouseDown={startDrag("body")}
                      style={{
                        left: `calc(${startPos()}%)`,
                        width: `calc(${endPos() - startPos()}% - 0px)`,
                      }}
                    />
                    <div
                      class="marker end"
                      onMouseDown={startDrag("end")}
                      style={{ left: `${endPos()}%` }}
                    >
                      <div class="handle"></div>
                      <div class="handle"></div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      step={0.01}
                      max={duration() - 0.1}
                      value={currentTime()}
                      onInput={(e) => {
                        const time = parseFloat(e.currentTarget.value);
                        videoRef.currentTime = time;
                        setCurrentTime(time);
                      }}
                    />
                  </div>
                  <div class="w-11 text-sm font-medium">
                    {formatMsToTime(duration() * 1000)}
                  </div>
                </div>
              </div>
              {getTrimDuration() > 0 ? (
                <p class="text-xs block text-center py-2">
                  <span class="font-meidum me-1">
                    {formatMsToTime(getTrimDuration() * 1000)}
                  </span>
                  The selected portion of the recording will be saved.
                </p>
              ) : null}
            </div>
          </div>
          <div class={"commentarea flex-none p-4 xl:ps-0 gap-2 "}>
            <div class="flex flex-col ">
              <div>
                <div class="flex justify-between items-center">
                  <h4 class="text-lg font-medium mb-4">New Spot</h4>
                  <form method="dialog">
                    <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3.5">
                      ✕
                    </button>
                  </form>
                </div>
                <div class="mb-4">
                  <label class={"text-base font-medium mb-2"}>Title</label>
                  <input
                    type="text"
                    placeholder="Name this Spot"
                    maxlength={64}
                    value={name()}
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    onInput={(e) => setName(e.currentTarget.value)}
                    class="input input-bordered w-full input-sm text-base mt-1"
                  />
                </div>
                <div>
                  <label class={"text-base font-medium"}>Comments</label>
                  <textarea
                    placeholder="Add more details..."
                    value={description()}
                    maxLength={256}
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    onInput={(e) => setDescription(e.currentTarget.value)}
                    class="textarea textarea-bordered w-full textarea-sm text-base leading-normal mt-1"
                    rows={4}
                  />
                </div>
              </div>

              <div class={"flex flex-col gap-3 justify-end mt-4"}>
                <div class="flex items-center gap-3">
                  <div
                    onClick={onSave}
                    class={
                      name().length
                        ? "btn btn-primary btn-sm text-white text-base"
                        : "btn-disabled btn btn-sm text-white text-base"
                    }
                  >
                    Save Spot
                  </div>

                  <div
                    onClick={onCancel}
                    class={
                      "btn btn-outline btn-primary btn-sm text-base hover:bg-white"
                    }
                  >
                    Cancel
                  </div>
                </div>

                <p class="text-xs">
                  Spots are saved to your{" "}
                  <a
                    href="https://app.openreplay.com/spots"
                    class="text-primary no-underline"
                    target="blank"
                  >
                    OpenReplay account.
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export default SavingControls;
