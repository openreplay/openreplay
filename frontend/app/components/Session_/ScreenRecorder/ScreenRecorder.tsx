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
import { PlayerContext, ILivePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { ENTERPRISE_REQUEIRED } from 'App/constants';

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
  return agent.includes('chrome') && !!window.chrome;
}

const supportedBrowsers = ['Chrome v91+', 'Edge v90+'];
const supportedMessage = `Supported Browsers: ${supportedBrowsers.join(', ')}`;

function ScreenRecorder({
  siteId,
  sessionId,
  agentId,
  isEnterprise,
}: {
  siteId: string;
  sessionId: string;
  isEnterprise: boolean;
  agentId: number,
}) {
  const { player, store } = React.useContext(PlayerContext) as ILivePlayerContext;
  const recordingState = store.get().recordingState;

  const [isRecording, setRecording] = React.useState(false);

  React.useEffect(() => {
    return () => stopRecorderCb?.();
  }, []);

  const onSave = async (saveObj: { name: string; duration: number }, blob: Blob) => {
    try {
      toast.warn('Uploading the recording...');
      const { URL, key } = await recordingsService.reserveUrl(siteId, { ...saveObj, sessionId });
      const status = await recordingsService.saveFile(URL, blob);

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
      void startRecording();
    }
    if (isRecording && recordingState !== SessionRecordingStatus.Recording) {
      stopRecordingHandler();
    }
  }, [recordingState, isRecording]);

  const onStop = () => {
    setRecording(false);
    player.assistManager.stopRecording();
  };

  const startRecording = async () => {
    try {
      // @ts-ignore
      stopRecorderCb = await screenRecorder(
        `${formatTimeOrDate(new Date().getTime(), undefined, true)}_${sessionId}`,
        sessionId,
        onSave,
        onStop
      );
      setRecording(true);
    } catch (e) {
      stopRecordingHandler()
      console.error(e);
    }
  };

  const stopRecordingHandler = () => {
    player.assistManager.ping('s_recording_ended', agentId)
    stopRecorderCb?.();
    onStop();
  };

  const recordingRequest = () => {
    const onDeny = () => toast.info('Recording request was rejected by user')
    player.assistManager.requestRecording({ onDeny });
  };

  React.useEffect(() => {
    if (isRecording) {
      player.assistManager.ping('s_recording_started', agentId)
    }
  }, [isRecording])

  if (!isSupported() || !isEnterprise) {
    return (
      <div className="p-2">
        {/* @ts-ignore */}
        <Tooltip
          title={isEnterprise ? supportedMessage : ENTERPRISE_REQUEIRED}
        >
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
  agentId: state.getIn(['user', 'account', 'id']),
}))(observer(ScreenRecorder));
