import { Component } from "solid-js";
import { RecordTabSvg, RecordDesktopSvg } from "../Icons";
import Button from "~/entrypoints/popup/Button";
import { AppState, RecordingArea } from "../types";

interface RecordingControlsProps {
  state: AppState;
  startRecording: (area: RecordingArea) => void;
  stopRecording: () => void;
}

const RecordingControls: Component<RecordingControlsProps> = (props) => {
  return (
    <>
      {props.state === AppState.RECORDING && (
        <Button name="End Recording" onClick={props.stopRecording} />
      )}

      {props.state === AppState.STARTING && (
        <div class="flex flex-row items-center gap-2 w-full justify-center">
          <div class="py-4">Your recording is starting</div>
        </div>
      )}

      {props.state === AppState.READY && (
        <div class="flex flex-row items-center gap-2 w-full justify-center">
          <button
            class="btn bg-indigo-100 text-base hover:bg-primary hover:text-white w-6/12"
            onClick={() => props.startRecording("tab")}
          >
            <RecordTabSvg />
            Record Tab
          </button>

          <button
            class="btn bg-teal-50 text-base hover:bg-primary hover:text-white"
            onClick={() => props.startRecording("desktop")}
          >
            <RecordDesktopSvg />
            Record Desktop
          </button>
        </div>
      )}
    </>
  );
};

export default RecordingControls;
