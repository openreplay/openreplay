import { SUPPORT_GLYPHS } from '@/ui/brand/support-glyphs';
import ENV from 'ENV';
import { ChevronRight, CircleHelp } from 'lucide-react';
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
                  <svg
                    className="m-support__glyph"
                    viewBox={SUPPORT_GLYPHS.chat.viewBox}
                    aria-hidden="true"
                  >
                    <path d={SUPPORT_GLYPHS.chat.d} fill="currentColor" />
                  </svg>
                  <span className="m-support__text">
                    <span className="m-support__label">
                      {t('Chat with us')}
                    </span>
                    <span className="m-support__hint">
                      {t('Message the team')}
                    </span>
                  </span>
                  {/* opens in the app, not a new tab */}
                  <ChevronRight
                    size={13}
                    strokeWidth={1.75}
                    className="m-support__out"
                    aria-hidden="true"
                  />
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
