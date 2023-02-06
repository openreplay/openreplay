import React, { useEffect, useState } from 'react';
import stl from './xrayButton.module.css';
import cn from 'classnames';
import { Tooltip } from 'UI';
import GuidePopup, { FEATURE_KEYS } from 'Shared/GuidePopup';
import { Controls as Player } from 'Player';
import { INDEXES } from 'App/constants/zindex';

interface Props {
  onClick?: () => void;
  isActive?: boolean;
}
function XRayButton(props: Props) {
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
        {showGuide ? (
          // <GuidePopup
          //   title={<div className="color-gray-dark">Introducing <span className={stl.text}>X-Ray</span></div>}
          //   description={"Get a quick overview on the issues in this session."}
          // >
            <button
              className={cn(stl.wrapper, { [stl.default]: !isActive, [stl.active]: isActive })}
              onClick={onClick}
              style={{ zIndex: INDEXES.POPUP_GUIDE_BTN, position: 'relative' }}
            >
              <span className="z-1">X-RAY</span>
            </button>

            // <div
            //   className="absolute bg-white top-0 left-0 z-0"
            //   style={{
            //     zIndex: INDEXES.POPUP_GUIDE_BG,
            //     width: '100px',
            //     height: '50px',
            //     borderRadius: '30px',
            //     margin: '-10px -16px',
            //   }}
            // ></div>
          // </GuidePopup>
        ) : (
          <Tooltip title="Get a quick overview on the issues in this session." disabled={isActive}>
            <button
              className={cn(stl.wrapper, { [stl.default]: !isActive, [stl.active]: isActive })}
              onClick={onClick}
            >
              <span className="z-1">X-RAY</span>
            </button>
          </Tooltip>
        )}
      </div>
    </>
  );
}

export default XRayButton;
