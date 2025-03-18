import React from 'react';

import { CodeBlock } from 'UI';

import ToggleContent from 'Shared/ToggleContent';
import { useTranslation } from 'react-i18next';

function AssistNpm(props) {
  const { t } = useTranslation();
  const usage = `import { tracker } from '@openreplay/tracker';
import trackerAssist from '@openreplay/tracker-assist';
tracker.configure({
  projectKey: '${props.projectKey}',
});
tracker.start()

tracker.use(trackerAssist(options)); // check the list of available options below`;
  const usageCjs = `import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope
import trackerAssist from '@openreplay/tracker-assist/cjs';

tracker.configure({
  projectKey: '${props.projectKey}'
});
const trackerAssist = tracker.use(trackerAssist(options)); // check the list of available options below
//...
function MyApp() {
  useEffect(async () => { // use componentDidMount in case of React Class Component
    tracker.start()
  }, [])
//...
}`;
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
    <div>
      <p>
        {t(
          'Initialize the tracker then load the @openreplay/tracker-assist plugin.',
        )}
      </p>

      <div className="font-bold my-2">{t('Usage')}</div>
      <ToggleContent
        label="Server-Side-Rendered (SSR)?"
        first={<CodeBlock code={usage} language="javascript" />}
        second={<CodeBlock code={usageCjs} language="jsx" />}
      />

      <div className="font-bold my-2">{t('Options')}</div>
      <CodeBlock code={options} language="typescript" />
    </div>
  );
}

export default AssistNpm;
