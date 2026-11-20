import { CodeBlock } from '@/ui/data/CodeBlock';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { assistNpmSnippet } from 'Components/Onboarding/install';
import ToggleContent from 'Shared/ToggleContent';

function AssistNpm({ projectKey }: { projectKey: string }) {
  const { t } = useTranslation();
  const usage = assistNpmSnippet(projectKey, false);
  const usageCjs = assistNpmSnippet(projectKey, true);
  const options = `trackerAssist({
  onAgentConnect: StartEndCallback;
  onCallStart: StartEndCallback;
  onRemoteControlStart: StartEndCallback;
  onRecordingRequest?: (agentInfo: Record<string, any>) => any;
  onCallDeny?: () => any;
  onRemoteControlDeny?: (agentInfo: Record<string, any>) => any;
  onRecordingDeny?: (agentInfo: Record<string, any>) => any;
  session_calling_peer_key: string;
  session_control_peer_key: string;
  callConfirm: ConfirmOptions;
  controlConfirm: ConfirmOptions;
  recordingConfirm: ConfirmOptions;
  socketHost?: string;
  config: RTCConfiguration;
  serverURL: string
  callUITemplate?: string;
})

type ConfirmOptions = {
  text?:string,
  style?: StyleObject, // style object (i.e {color: 'red', borderRadius: '10px'})
  confirmBtn?: ButtonOptions,
  declineBtn?: ButtonOptions
}

type ButtonOptions = HTMLButtonElement | string | {
  innerHTML?: string, // to pass an svg string or text
  style?: StyleObject, // style object (i.e {color: 'red', borderRadius: '10px'})
}
`;
  return (
    <>
      <p className="m-int__blurb">
        {t(
          'Initialize the tracker then load the @openreplay/tracker-assist plugin.',
        )}
      </p>
      <ToggleContent
        label={t('Server-Side-Rendered (SSR)?')}
        first={<CodeBlock code={usage} language="javascript" />}
        second={<CodeBlock code={usageCjs} language="jsx" />}
      />
      <p className="m-int__sub">{t('Options')}</p>
      <CodeBlock code={options} language="typescript" />
    </>
  );
}

export default AssistNpm;
