import React, { useState } from 'react';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { Tooltip } from 'UI';
import { useTranslation } from 'react-i18next';

function EmailVerificationMessage(props) {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const [sent, setSent] = useState(false);
  const { email } = props;
  const send = () => {
    userStore.resendEmailVerification(email).then(() => {
      toast.success(`${t('Verification email sent to')} ${email}`);
      setSent(true);
    });
  };
  return !sent ? (
    <Tooltip
      title={`${t("We've sent a verification email to")} "${email}" ${t('please follow the instructions in it to use OpenReplay uninterruptedly.')}`}
    >
      <div
        className="mt-3 px-3 rounded-2xl font-medium"
        style={{
          paddingTop: '3px',
          height: '28px',
          backgroundColor: 'rgba(255, 239, 239, 1)',
          border: 'solid thin rgba(221, 181, 181, 1)',
        }}
      >
        <span>{t('Please, verify your email.')}</span>{' '}
        <a href="#" className="link" onClick={send}>
          {t('Resend')}
        </a>
      </div>
    </Tooltip>
  ) : null;
}

export default EmailVerificationMessage;
