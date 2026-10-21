import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';

import AlertsBanner from './AlertsBanner';
import LangBanner from './LangBanner';
import './banners.css';

const langBannerClosedKey = '__or__langBannerClosed';
const getLangBannerClosed = () =>
  localStorage.getItem(langBannerClosedKey) === '1';

/** Account-wide notices, inside the page at its own inset. */
function HeaderBanners() {
  const { userStore } = useStore();
  const [langBannerClosed, setLangBannerClosed] =
    React.useState(getLangBannerClosed);

  React.useEffect(() => {
    const langBannerVal = localStorage.getItem(langBannerClosedKey);
    if (langBannerVal === null) {
      localStorage.setItem(langBannerClosedKey, '0');
    }
    if (langBannerVal === '0') {
      localStorage.setItem(langBannerClosedKey, '1');
    }
  }, []);

  const closeLangBanner = () => {
    setLangBannerClosed(true);
    localStorage.setItem(langBannerClosedKey, '1');
  };

  if (langBannerClosed && !userStore.account?.alerts?.length) return null;
  return (
    <div className="m-shell__notices">
      <AlertsBanner />
      {langBannerClosed ? null : <LangBanner onClose={closeLangBanner} />}
    </div>
  );
}

export default observer(HeaderBanners);
