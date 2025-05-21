import { Component, For } from "solid-js";
import micOff from "~/assets/mic-off-red.svg";
import micOn from "~/assets/mic-on-dark.svg";
import Dropdown from "~/entrypoints/popup/Dropdown";
import { ChevronSvg } from "../Icons";
import { AudioDevice } from "../types";

interface AudioPickerProps {
  mic: () => boolean;
  audioDevices: () => AudioDevice[];
  selectedAudioDevice: () => string;
  isChecking: () => boolean;
  onMicToggle: () => void;
  onCheckAudio: () => void;
  onSelectDevice: (deviceId: string) => void;
}

const AudioPicker: Component<AudioPickerProps> = (props) => {
  return (
    <div class="inline-flex items-center gap-1 text-xs">
      <div
        class="p-1 cursor-pointer btn btn-xs bg-white hover:bg-indigo-lightest pointer-events-auto tooltip tooltip-right text-sm font-normal"
        data-tip={props.mic() ? "Switch Off Mic" : "Switch On Mic"}
        onClick={props.onMicToggle}
      >
        <img
          src={props.mic() ? micOn : micOff}
          alt={props.mic() ? "microphone on" : "microphone off"}
          width={16}
          height={16}
        />
      </div>

      <div
        class="flex items-center gap-1 btn btn-xs btn-ghost hover:bg-neutral/20 rounded-lg pointer-events-auto"
        onClick={props.onCheckAudio}
      >
        {props.audioDevices().length === 0 ? (
          <div class="max-w-64 block leading-tight cursor-pointer whitespace-nowrap overflow-hidden font-normal">
            {props.isChecking()
              ? "Loading audio devices"
              : "Grant microphone access"}
          </div>
        ) : (
          <Dropdown
            options={props.audioDevices()}
            selected={props.selectedAudioDevice()}
            onChange={props.onSelectDevice}
          />
        )}
        <ChevronSvg />
      </div>
    </div>
  );
};

export default AudioPicker;
