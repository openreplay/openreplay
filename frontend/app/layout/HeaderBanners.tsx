import React from 'react';

import AlertsBanner from './AlertsBanner';
import LangBanner from './LangBanner';

const langBannerClosedKey = '__or__langBannerClosed';
const getLangBannerClosed = () =>
  localStorage.getItem(langBannerClosedKey) === '1';

function HeaderBanners() {
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

  return (
    <>
      <AlertsBanner />
      {langBannerClosed ? null : <LangBanner onClose={closeLangBanner} />}
    </>
  );
}

export default HeaderBanners;
