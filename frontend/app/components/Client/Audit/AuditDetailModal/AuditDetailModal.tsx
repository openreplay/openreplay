import React from 'react';
import { JSONTree } from 'UI';
import { checkForRecent } from 'App/date';
import { useTranslation } from 'react-i18next';

interface Props {
  audit: any;
}
function AuditDetailModal(props: Props) {
  const { t } = useTranslation();
  const { audit } = props;
  // const jsonResponse = typeof audit.payload === 'string' ? JSON.parse(audit.payload) : audit.payload;
  // console.log('jsonResponse', jsonResponse)

  return (
    <div className="bg-white h-screen overflow-y-auto">
      <h1 className="text-2xl p-4">{t('Audit Details')}</h1>
      <div className="p-4">
        <h5 className="mb-2">{t('URL')}</h5>
        <div className="color-gray-darkest p-2 bg-gray-lightest rounded">
          {audit.endPoint}
        </div>

        <div className="grid grid-cols-2 my-6">
          <div className="">
            <div className="font-medium mb-2">{t('Username')}</div>
            <div>{audit.username}</div>
          </div>
          <div className="">
            <div className="font-medium mb-2">{t('Created At')}</div>
            <div>
              {audit.createdAt &&
                checkForRecent(audit.createdAt, 'LLL dd, yyyy, hh:mm a')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 my-6">
          <div className="">
            <div className="font-medium mb-2">{t('Action')}</div>
            <div>{audit.action}</div>
          </div>
          <div className="">
            <div className="font-medium mb-2">{t('Method')}</div>
            <div>{audit.method}</div>
          </div>
        </div>

        {audit.payload && (
          <div className="my-6">
            <div className="font-medium mb-3">{t('Payload')}</div>
            <JSONTree src={audit.payload} collapsed={false} enableClipboard />
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditDetailModal;
