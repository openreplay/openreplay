import React from 'react';
import OpenReplayPreloader from '../../svg/openreplay-preloader.svg';

interface ORLoaderProps {
  width?: string;
  height?: string;
}

const ORLoader: React.FC<ORLoaderProps> = ({
  width = '50px',
  height = '50px',
}) => {
  return (
    <div className="or-loader" style={{ width, height }}>
      <img
        src={OpenReplayPreloader}
        alt="Loading..."
        width={width}
        height={height}
      />
    </div>
  );
};

export default ORLoader;
