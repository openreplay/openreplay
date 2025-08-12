import React from 'react';
import { Redo } from 'lucide-react';
import { mobileScreen } from 'App/utils/isMobile';
import { useTranslation } from 'react-i18next';

const checkLandscape = () =>
  window.screen.orientation?.type.startsWith('landscape');

function PhoneHorizontalWarn() {
  const { t } = useTranslation();
  const [isLandscape, setLandscape] = React.useState(checkLandscape);

  React.useEffect(() => {
    const handleOrientationChange = () => {
      setLandscape(checkLandscape());
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);
  if (!mobileScreen || isLandscape) {
    return null;
  }

  return (
    <div
      style={{ zIndex: 999 }}
      className="flex fixed top-0 left-0 items-center justify-center flex-col h-screen w-screen bg-gray-lightest text-center"
    >
      <Redo className="w-6 h-6 mb-2 text-black" />
      <div className="text-black">
        {t(`Please rotate your device to landscape mode to watch the replay.`)}
      </div>
    </div>
  );
}

export default PhoneHorizontalWarn;
