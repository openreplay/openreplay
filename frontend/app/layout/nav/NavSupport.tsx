import ENV from 'env';
import { CircleHelp, MessageCircle } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import SupportModal from 'App/layout/SupportModal';

import { SupportMenu } from 'Shared/SupportMenu/SupportMenu';

/**
 * The nav foot's help: the "?" in the tools row and everything it opens.
 * Self-contained and prop-less so the saas repo can replace this file by
 * path (a modal, a chat) without touching SideNav. A replacement renders one
 * trigger with the `m-nav__tool` class to sit in the row.
 */
function NavSupport() {
  const { t } = useTranslation();
  const [chat, setChat] = useState(false);
  return (
    <>
      <SupportMenu
        placement="topLeft"
        extra={
          ENV.CRISP_KEY
            ? (close) => (
                <button
                  type="button"
                  className="m-support__row"
                  onClick={() => {
                    close();
                    setChat(true);
                  }}
                >
                  <MessageCircle
                    size={15}
                    className="m-support__glyph"
                    aria-hidden="true"
                  />
                  <span className="m-support__text">
                    <span className="m-support__label">
                      {t('Chat with us')}
                    </span>
                  </span>
                </button>
              )
            : undefined
        }
      >
        <button type="button" className="m-nav__tool" aria-label={t('Support')}>
          <CircleHelp size={15} aria-hidden="true" />
        </button>
      </SupportMenu>
      <SupportModal onClose={() => setChat(false)} open={chat} />
    </>
  );
}

export default NavSupport;
