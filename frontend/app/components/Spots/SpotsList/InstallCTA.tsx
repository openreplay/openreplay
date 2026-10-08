import { Button } from '@/ui/actions/button';
import { Notice } from '@/ui/feedback/Notice';
import { SquareArrowOutUpRight } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const extKey = '__$spot_ext_exist$__';
export const STORE_URL =
  'https://chromewebstore.google.com/detail/openreplay-spot-record-re/ckigbicapkkgfomcfmcbaaplllopgbid';

function InstallCTA() {
  const { t } = useTranslation();
  const [extExist, setExtExist] = React.useState<boolean>(false);
  const isChromium =
    // @ts-ignore
    window.chrome ||
    // @ts-ignore
    (!!navigator.userAgentData &&
      // @ts-ignore
      navigator.userAgentData.brands.some((data) => data.brand == 'Chromium'));

  React.useEffect(() => {
    let int: any;
    const v = localStorage.getItem(extKey);
    if (v) {
      setExtExist(true);
    } else {
      int = setInterval(() => {
        window.postMessage({ type: 'orspot:ping' }, '*');
      });
      const onSpotMsg = (e: any) => {
        if (e.data.type === 'orspot:pong') {
          setExtExist(true);
          localStorage.setItem(extKey, '1');
          clearInterval(int);
          int = null;
          window.removeEventListener('message', onSpotMsg);
        }
      };
      window.addEventListener('message', onSpotMsg);
    }
    return () => {
      if (int) {
        clearInterval(int);
      }
    };
  }, []);

  if (!isChromium && !extExist) {
    return (
      <Notice kind="info" className="m-spot-cta">
        {t(
          'Spot is designed for Chrome. Please install Chrome and navigate to this page to start using Spot.',
        )}
      </Notice>
    );
  }
  if (extExist) return null;
  return (
    <Notice kind="info" className="m-spot-cta">
      <span>
        {t('It looks like you haven’t installed the Spot extension yet.')}
      </span>
      <Button asChild variant="secondary">
        <a href={STORE_URL} target="_blank" rel="noreferrer">
          {t('Get the extension')}
          <SquareArrowOutUpRight size={13} aria-hidden="true" />
        </a>
      </Button>
    </Notice>
  );
}

export default InstallCTA;
