import React, { useState } from 'react';
import { Icon } from 'UI';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import ErrorFrame from '../ErrorFrame/ErrorFrame';
import { useTranslation } from 'react-i18next';

const docLink = 'https://docs.openreplay.com/deployment/upload-sourcemaps';

interface Props {
  fetchErrorStackList: any;
  sourcemapUploaded?: boolean;
  errorStack?: any;
  message?: string;
  error: any;
}
function ErrorDetails(props: Props) {
  const { t } = useTranslation();
  const { errorStore, sessionStore } = useStore();
  const { sessionId } = sessionStore.current;
  const errorStack = errorStore.instanceTrace;
  const { error, message = '', sourcemapUploaded = false } = props;
  const [showRaw, setShowRaw] = useState(false);
  const firstFunc = errorStack[0] && errorStack[0].function;

  const openDocs = () => {
    window.open(docLink, '_blank');
  };

  return (
    <div className="bg-white p-5 h-screen">
      {!sourcemapUploaded && (
        <div
          style={{ backgroundColor: 'rgba(204, 0, 0, 0.1)' }}
          className="font-normal flex items-center text-sm font-regular color-red border p-2 rounded"
        >
          <Icon name="info" size="16" color="red" />
          <div className="ml-2">
            {t(
              'Source maps must be uploaded to OpenReplay to be able to see stack traces.',
            )}
            &nbsp;
            <a
              href="#"
              className="color-red font-medium underline"
              style={{ textDecoration: 'underline' }}
              onClick={openDocs}
            >
              {t('Learn more.')}
            </a>
          </div>
        </div>
      )}
      <div className="flex items-center my-3">
        <h3 className="text-xl mr-auto">{t('Stacktrace')}</h3>
        <div className="flex justify-end mr-2">
          <Button
            type="text"
            className={!showRaw ? 'text-main' : ''}
            onClick={() => setShowRaw(false)}
          >
            {t('FULL')}
          </Button>
          <Button
            type="text"
            className={showRaw ? 'text-main' : ''}
            onClick={() => setShowRaw(true)}
          >
            {t('RAW')}
          </Button>
        </div>
      </div>
      <div className="mb-6 code-font" data-hidden={showRaw}>
        <div className="leading-relaxed font-weight-bold">{error.name}</div>
        <div style={{ wordBreak: 'break-all' }}>{message}</div>
      </div>
      {showRaw && (
        <div className="mb-3 code-font">
          {error.name} :{firstFunc || '?'}
        </div>
      )}
      {errorStack.map((frame: any, i: any) => (
        <div className="mb-3" key={frame.key}>
          <ErrorFrame frame={frame} showRaw={showRaw} isFirst={i == 0} />
        </div>
      ))}
    </div>
  );
}

ErrorDetails.displayName = 'ErrorDetails';
export default observer(ErrorDetails);
