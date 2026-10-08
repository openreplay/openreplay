import { Button } from '@/ui/actions/button';
import { toast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { SessionRecordingStatus } from 'Player';
import { CircleStop, Disc } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  ILivePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { ENTERPRISE_REQUEIRED } from 'App/constants';
import { formatTimeOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { recordingsService } from 'App/services';
import { screenRecorder } from 'App/utils/screenRecorder';

let stopRecorderCb: () => void;

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

function ScreenRecorder() {
  const { t } = useTranslation();
  const { projectsStore, sessionStore, userStore } = useStore();
  const { isEnterprise } = userStore;
  const agentId = userStore.account.id;
  const { sessionId } = sessionStore.current;
  const { siteId } = projectsStore;
  const { player, store } = React.useContext(
    PlayerContext,
  ) as ILivePlayerContext;
  const { recordingState } = store.get();

  const [isRecording, setRecording] = React.useState(false);

  React.useEffect(() => () => stopRecorderCb?.(), []);

  const onSave = async (
    saveObj: { name: string; duration: number },
    blob: Blob,
  ) => {
    try {
      toast.warn('Uploading the recording...');
      const { URL, key } = await recordingsService.reserveUrl(siteId, {
        ...saveObj,
        sessionId,
      });
      const status = await recordingsService.saveFile(URL, blob);

      if (status) {
        await recordingsService.confirmFile(
          siteId,
          { ...saveObj, sessionId },
          key,
        );
        toast.success(t('Session recording uploaded'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t("Couldn't upload the file"));
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
        onStop,
      );
      setRecording(true);
    } catch (e) {
      stopRecordingHandler();
      console.error(e);
    }
  };

  const stopRecordingHandler = () => {
    player.assistManager.ping('s_recording_ended', agentId);
    stopRecorderCb?.();
    onStop();
  };

  const recordingRequest = () => {
    const onDeny = () =>
      toast.info(t('Recording request was rejected by user'));
    player.assistManager.requestRecording({ onDeny });
  };

  React.useEffect(() => {
    if (isRecording) {
      player.assistManager.ping('s_recording_started', agentId);
    }
  }, [isRecording]);

  if (!isSupported() || !isEnterprise) {
    return (
      <Tooltip
        title={isEnterprise ? supportedMessage : ENTERPRISE_REQUEIRED(t)}
      >
        <span>
          <Button className="m-rs__assist" disabled>
            <Disc size={13} />
            {t('Record activity')}
          </Button>
        </span>
      </Tooltip>
    );
  }

  return (
    <Button
      className={`m-rs__assist${isRecording ? ' is-on' : ''}`}
      aria-pressed={isRecording}
      onClick={!isRecording ? recordingRequest : stopRecordingHandler}
    >
      {isRecording ? <CircleStop size={13} /> : <Disc size={13} />}
      {isRecording ? t('Stop recording') : t('Record activity')}
    </Button>
  );
}

export default observer(ScreenRecorder);
