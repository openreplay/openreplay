import React from 'react';
import { screenRecorder } from 'App/utils/screenRecorder';
import { Tooltip } from 'react-tippy'
import { Button } from 'UI'
import { requestRecording, stopRecording, connectPlayer } from 'Player'
import {
  SessionRecordingStatus,
} from 'Player/MessageDistributor/managers/AssistManager';
let stopRecorderCb: () => void

/**
 * "edge" || "edg/"   chromium based edge (dev or canary)
 * "chrome" && window.chrome   chrome
 * "opr" && (!!window.opr || !!window.opera)   opera
 * "trident"   ie
 * "firefox"   firefox
 * "safari"   safari
 */
function isSupported() {
  const agent = window.navigator.userAgent.toLowerCase()

  if (agent.includes("edge") || agent.includes("edg/")) return true
  // @ts-ignore
  if (agent.includes("chrome") && !!window.chrome) return true

  return false
}

const supportedBrowsers = ["Chrome v91+", "Edge v90+"]
const supportedMessage = `Supported Browsers: ${supportedBrowsers.join(', ')}`

function ScreenRecorder({ recordingState }: { recordingState: SessionRecordingStatus }) {
  const [isRecording, setRecording] = React.useState(false);

  React.useEffect(() => {
    return () => stopRecorderCb?.()
  }, [])

  React.useEffect(() => {
    if (!isRecording && recordingState === SessionRecordingStatus.Recording) {
      startRecording();
    }
    if (isRecording && recordingState !== SessionRecordingStatus.Recording) {
      stopRecordingHandler();
    }
  }, [recordingState, isRecording])

  const startRecording = async () => {
      const stop = await screenRecorder();
      stopRecorderCb = stop;
      setRecording(true);
  };

  const stopRecordingHandler = () => {
    stopRecording()
    stopRecorderCb?.();
    setRecording(false);
  }

  const recordingRequest = () => {
    requestRecording()
    // startRecording()
  }

  if (!isSupported()) return (
    <div className="p-2">
      {/* @ts-ignore */}
      <Tooltip title={supportedMessage}>
        <Button icon="record-circle" disabled variant={isRecording ? "text-red" : "text-primary"}>
          Record Activity
        </Button>
      </Tooltip>
    </div>
  )
  return (
    <div onClick={!isRecording ? recordingRequest : stopRecordingHandler} className="p-2">
      <Button icon={!isRecording ? 'stop-record-circle' : 'record-circle'} variant={isRecording ? "text-red" : "text-primary"}>
        {isRecording ? 'Stop Recording' : 'Record Activity'}
      </Button>
    </div>
  );
}

// @ts-ignore
export default connectPlayer(state => ({ recordingState: state.recordingState}))(ScreenRecorder)
