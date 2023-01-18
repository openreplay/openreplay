import React, { useEffect } from 'react';
import stl from './xrayButton.module.css';
import cn from 'classnames';
import { Tooltip } from 'UI';
import { PlayerContext } from 'App/components/Session/playerContext';

interface Props {
  onClick?: () => void;
  isActive?: boolean;
}
function XRayButton(props: Props) {
  const { player: Player } = React.useContext(PlayerContext);

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
        ></div>
      )}
      <div className="relative">
        <Tooltip title="Get a quick overview on the issues in this session." disabled={isActive}>
          <button
            className={cn(stl.wrapper, { [stl.default]: !isActive, [stl.active]: isActive })}
            onClick={onClick}
          >
            <span className="z-1">X-RAY</span>
          </button>
        </Tooltip>
      </div>
    </>
  );
}

export default XRayButton;
