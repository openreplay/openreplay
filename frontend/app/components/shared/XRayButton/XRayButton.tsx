import { LaunchXRaShortcut } from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import React, { useEffect } from 'react';
import cn from 'classnames';
import { Popover } from 'antd';
import { PlayerContext } from 'App/components/Session/playerContext';
import stl from './xrayButton.module.css';
import { useTranslation } from 'react-i18next';

interface Props {
  onClick?: () => void;
  isActive?: boolean;
}

function XRayButton(props: Props) {
  const { player: Player } = React.useContext(PlayerContext);
  const { t } = useTranslation();

  const { isActive } = props;
  // const [showGuide, setShowGuide] = useState(!localStorage.getItem(FEATURE_KEYS.XRAY));
  const showGuide = false;
  const setShowGuide = (anyt: any) => anyt;

  useEffect(() => {
    if (!showGuide) {
      return;
    }
    Player.pause();
  }, []);

  const onClick = () => {
    setShowGuide(false);
    localStorage.setItem('featureViewed', 'true');
    props.onClick();
  };
  return (
    <>
      {showGuide && (
        <div
          onClick={() => {
            setShowGuide(false);
            localStorage.setItem('featureViewed', 'true');
          }}
          className="bg-gray-darkest fixed inset-0 z-10 w-full h-screen"
          style={{ zIndex: 9999, opacity: '0.7' }}
        />
      )}
      <div className="relative">
        <Popover
          content={
            <div className="flex items-center gap-2">
              <LaunchXRaShortcut />
              <div>
                {t('Get a quick overview on the issues in this session.')}
              </div>
            </div>
          }
        >
          <button
            className={cn(stl.wrapper, {
              [stl.default]: !isActive,
              [stl.active]: isActive,
            })}
            onClick={onClick}
          >
            <span className="z-1">{t('X-RAY')}</span>
          </button>
        </Popover>
      </div>
    </>
  );
}

export default XRayButton;
