import React from 'react';
import { screenRecorder } from 'App/utils/screenRecorder';
import { Tooltip } from 'react-tippy'

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

function ScreenRecorder() {
  const [isRecording, setRecording] = React.useState(false);

  const toggleRecording = async () => {
    console.log(isRecording);
    if (isRecording) {
      stopRecorderCb?.();
      setRecording(false);
    } else {
      const stop = await screenRecorder();
      stopRecorderCb = stop;
      setRecording(true);
    }
  };

  const isSupportedBrowser = isSupported()
  if (!isSupportedBrowser) return (
    <div className="p-3">
      {/* @ts-ignore */}
      <Tooltip title="Supported browsers: Chrome v91+; Edge v90+">
        <div className="p-1 text-disabled-text cursor-not-allowed">Record</div>
      </Tooltip>
    </div>
  )
  return (
    <div onClick={toggleRecording} className="p-3">
      <div className="p-1 font-semibold cursor-pointer hover:text-main">{isRecording ? 'STOP' : 'RECORD'}</div>
    </div>
  );
}

export default ScreenRecorder
