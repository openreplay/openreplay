import React from 'react';
import { screenRecorder } from 'App/utils/screenRecorder';
import { Tooltip } from 'react-tippy';
import { connect } from 'react-redux';
import { Button } from 'UI';
import { SessionRecordingStatus } from 'Player';
let stopRecorderCb: () => void;
import { recordingsService } from 'App/services';
import { toast } from 'react-toastify';
import { formatTimeOrDate } from 'App/date';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

/**
 * "edge" || "edg/"   chromium based edge (dev or canary)
 * "chrome" && window.chrome   chrome
 * "opr" && (!!window.opr || !!window.opera)   opera
 * "trident"   ie
 * "firefox"   firefox
 * "safari"   safari
 */
function isSupported() {
  const agent = window.navigator.userAgent.toLowerCase();

  if (agent.includes('edge') || agent.includes('edg/')) return true;
  // @ts-ignore
  if (agent.includes('chrome') && !!window.chrome) return true;

  return false;
}

const supportedBrowsers = ['Chrome v91+', 'Edge v90+'];
const supportedMessage = `Supported Browsers: ${supportedBrowsers.join(', ')}`;

function ScreenRecorder({
  siteId,
  sessionId,
  isEnterprise,
}: {
  siteId: string;
  sessionId: string;
  isEnterprise: boolean;
}) {
  const { player, store } = React.useContext(PlayerContext)
  const recordingState = store.get().recordingState

  const [isRecording, setRecording] = React.useState(false);

  React.useEffect(() => {
    return () => stopRecorderCb?.();
  }, []);

  const onSave = async (saveObj: { name: string; duration: number }, blob: Blob) => {
    try {
      toast.warn('Uploading the recording...');
      const { URL, key } = await recordingsService.reserveUrl(siteId, { ...saveObj, sessionId });
      const status = recordingsService.saveFile(URL, blob);

      if (status) {
        await recordingsService.confirmFile(siteId, { ...saveObj, sessionId }, key);
        toast.success('Session recording uploaded');
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't upload the file");
    }
  };

  React.useEffect(() => {
    if (!isRecording && recordingState === SessionRecordingStatus.Recording) {
      startRecording();
    }
    if (isRecording && recordingState !== SessionRecordingStatus.Recording) {
      stopRecordingHandler();
    }
  }, [recordingState, isRecording]);

  const startRecording = async () => {
    const stop = await screenRecorder(
      `${formatTimeOrDate(new Date().getTime(), undefined, true)}_${sessionId}`,
      sessionId,
      onSave
    );
    stopRecorderCb = stop;
    setRecording(true);
  };

  const stopRecordingHandler = () => {
    player.assistManager.stopRecording();
    stopRecorderCb?.();
    setRecording(false);
  };

  const recordingRequest = () => {
    player.assistManager.requestRecording()
  };

  if (!isSupported() || !isEnterprise) {
    return (
      <div className="p-2">
        {/* @ts-ignore */}
        <Tooltip title={isEnterprise ? supportedMessage : 'This feature requires an enterprise license.'}>
          <Button icon="record-circle" disabled variant="text-primary">
            Record Activity
          </Button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div onClick={!isRecording ? recordingRequest : stopRecordingHandler} className="p-2">
      <Button
        icon={!isRecording ? 'stop-record-circle' : 'record-circle'}
        variant={isRecording ? 'text-red' : 'text-primary'}
      >
        {isRecording ? 'Stop Recording' : 'Record Activity'}
      </Button>
    </div>
  );
}

export default connect((state: any) => ({
    isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
    siteId: state.getIn(['site', 'siteId']),
    sessionId: state.getIn(['sessions', 'current']).sessionId,
  }))(observer(ScreenRecorder))
