import { Loader } from '@/ui/feedback/Loader';
import { ConnectionStatus } from 'Player';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ovStl from 'Components/Session_/Player/Overlay/overlay.module.css';

interface Props {
  connectionStatus: ConnectionStatus;
}

export default function LiveStatusText({ connectionStatus }: Props) {
  const { t } = useTranslation();
  const renderView = () => {
    switch (connectionStatus) {
      case ConnectionStatus.Closed:
        return (
          <div className="flex flex-col items-center text-center">
            <div className="text-md font-medium text-content-primary -mt-8">
              {t('Session not found')}
            </div>
            <div className="text-sm text-content-muted mt-1">
              {t('The remote session doesn’t exist anymore.')}
              <br />{' '}
              {t(
                'The user may have closed the tab/browser while you were trying to establish a connection.',
              )}
            </div>
          </div>
        );

      case ConnectionStatus.Connecting:
        return (
          <div className="flex flex-col items-center">
            <Loader loading />
            <div className="text-md font-medium text-content-primary -mt-8">
              {t('Connecting...')}
            </div>
            <div className="text-sm text-content-muted mt-1">
              {t('Establishing a connection with the remote session.')}
            </div>
          </div>
        );
      case ConnectionStatus.WaitingMessages:
        return (
          <div className="flex flex-col items-center">
            <Loader loading />
            <div className="text-md font-medium text-content-primary -mt-8">
              {t('Waiting for the session to become active...')}
            </div>
            <div className="text-sm text-content-muted mt-1">
              {t(
                "If it's taking too much time, it could mean the user is simply inactive.",
              )}
            </div>
          </div>
        );
      case ConnectionStatus.Connected:
        return (
          <div className="flex flex-col items-center">
            <div className="text-md font-medium text-content-primary -mt-8">
              {t('Connected')}
            </div>
          </div>
        );
      case ConnectionStatus.Inactive:
        return (
          <div className="flex flex-col items-center">
            <Loader loading />
            <div className="text-md font-medium text-content-primary -mt-8">
              {t('Waiting for the session to become active...')}
            </div>
            <div className="text-sm text-content-muted mt-1">
              {t(
                "If it's taking too much time, it could mean the user is simply inactive.",
              )}
            </div>
          </div>
        );
      case ConnectionStatus.Disconnected:
        return (
          <div className="flex flex-col items-center">
            <div className="text-md font-medium text-content-primary -mt-8">
              {t('Disconnected')}
            </div>
            <div className="text-sm text-content-muted mt-1">
              {t(
                'The connection was lost with the remote session. The user may have simply closed the tab/browser.',
              )}
            </div>
          </div>
        );
      case ConnectionStatus.Error:
        return (
          <div className="flex flex-col items-center">
            <div className="text-md font-medium text-content-primary -mt-8">
              {t('Error')}
            </div>
            <div className="text-sm text-content-muted mt-1">
              {t('Something wrong just happened. Try refreshing the page.')}
            </div>
          </div>
        );
    }
  };
  return <div className={ovStl.overlay}>{renderView()}</div>;
}
