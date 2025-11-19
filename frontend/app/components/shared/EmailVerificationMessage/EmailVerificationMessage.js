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
        className="px-3 rounded-2xl font-medium bg-white border py-1 flex items-center gap-2"
      >
        <span>{t('Please, verify your email. ')}</span>
        <a href="#" className="link" onClick={send}>
          {t('Resend')}
        </a>
      </div>
    </Tooltip>
  ) : null;
}

export default EmailVerificationMessage;
