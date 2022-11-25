import React, { useEffect, useState } from 'react';
import { Tooltip } from 'UI';
import { INDEXES } from 'App/constants/zindex';
import { PlayerContext } from 'App/components/Session/playerContext';

export const FEATURE_KEYS = {
  XRAY: 'featureViewed',
  NOTES: 'notesFeatureViewed',
};

interface IProps {
  children?: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  key?: keyof typeof FEATURE_KEYS;
}

export default function GuidePopup({ children, title, description }: IProps) {
  const { player: Player } = React.useContext(PlayerContext)

  const [showGuide, setShowGuide] = useState(!localStorage.getItem(FEATURE_KEYS.NOTES));
  useEffect(() => {
    if (!showGuide) {
      return;
    }
    Player.pause();
  }, []);

  const onClick = () => {
    setShowGuide(false);
    localStorage.setItem(FEATURE_KEYS.NOTES, 'true');
    Player.togglePlay()
  };

  return showGuide ? (
    <div>
      <div
        onClick={onClick}
        className="bg-gray-darkest fixed inset-0 z-10 w-full h-screen cursor-pointer"
        style={{ zIndex: INDEXES.POPUP_GUIDE_BG, opacity: '0.7' }}
      ></div>
      <Tooltip
        offset={20}
        className="!bg-white rounded text-center shadow !p-6"
        title={
          <div className="relative">
            <div className="font-bold text-figmaColors-text-primary">{title}</div>
            <div className="color-gray-dark w-80">{description}</div>
            <div className="w-4 h-4 bg-white rotate-45 absolute right-0 left-0 m-auto" style={{ top: '-28px'}} />
          </div>
        }
        open={true}
      >
        <div className="relative pointer-events-none">
          <div className="" style={{ zIndex: INDEXES.POPUP_GUIDE_BTN, position: 'inherit' }}>
            {children}
          </div>
          <div
            className="absolute bg-white top-0 left-0"
            style={{
              zIndex: INDEXES.POPUP_GUIDE_BG,
              width: '120px',
              height: '40px',
              borderRadius: '30px',
              margin: '-2px -10px',
            }}
          ></div>
        </div>
      </Tooltip>
    </div>
  ) : (
    <>
      {children}
    </>
  );
}
