import Countdown from "~/entrypoints/content/Countdown";
import "~/assets/main.css";
import "./style.css";
import { createSignal } from "solid-js";
import RecordingControls from "./RecordingControls";
import SavingControls from "./SavingControls";
import { STATES } from "./utils";

interface IControlsBox {
  stop: () => Promise<any>;
  pause: () => void;
  resume: () => void;
  getVideoData: () => Promise<any>;
  getMicStatus: () => Promise<any>;
  callRecording: () => Promise<boolean>;
  getClockStart: () => number;
  onClose: (
    save: boolean,
    spotObj?: {
      blob?: Blob;
      name?: string;
      comment?: string;
      useHook?: boolean;
      thumbnail?: string;
    },
  ) => void;
  muteMic: () => void;
  unmuteMic: () => void;
  getInitState: () => string;
  onRestart: () => void;
  getErrorEvents: () => Promise<any>;
  getAudioPerm: () => 0 | 1 | 2;
}

function ControlsBox({
  stop,
  pause,
  resume,
  getVideoData,
  getMicStatus,
  onClose,
  getClockStart,
  muteMic,
  unmuteMic,
  getInitState,
  callRecording,
  onRestart,
  getErrorEvents,
  getAudioPerm,
}: IControlsBox) {
  const initialState =
    getInitState() === "recording" ? STATES.recording : STATES.count;
  const [boxState, setBoxState] =
    createSignal<keyof typeof STATES>(initialState);
  const changeState = (newState: keyof typeof STATES) => {
    setBoxState(newState);
  };

  const onTimerEnd = async (proceed?: boolean) => {
    if (!proceed) {
      onClose(false);
      return changeState(STATES.idle);
    }
    let tries = 0;
    changeState(STATES.idle);
    await callRecording();
    let int = setInterval(() => {
      const state = getInitState();
      tries++;
      if (tries > 200) {
        clearInterval(int);
        changeState(STATES.idle);
      }
      if (state !== "count") {
        clearInterval(int);
        changeState(STATES.recording);
      }
    }, 50);
  };

  return (
    <div class={"controls"}>
      {boxState() === STATES.saving ? (
        <SavingControls
          getErrorEvents={getErrorEvents}
          getVideoData={getVideoData}
          onClose={onClose}
        />
      ) : null}
      {boxState() === STATES.count ? (
        <Countdown getAudioPerm={getAudioPerm} onEnd={onTimerEnd} />
      ) : null}
      {boxState() === STATES.recording ? (
        <RecordingControls
          getAudioPerm={getAudioPerm}
          getMicStatus={getMicStatus}
          changeState={changeState}
          pause={pause}
          resume={resume}
          stop={stop}
          getClockStart={getClockStart}
          mute={muteMic}
          unmute={unmuteMic}
          getInitState={getInitState}
          onRestart={onRestart}
        />
      ) : null}
    </div>
  );
}

export default ControlsBox;
