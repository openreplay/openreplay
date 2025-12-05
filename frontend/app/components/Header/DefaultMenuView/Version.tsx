import React from 'react';
import ENV from '../../../../env';
function Version() {
  return (
    <div
      className="absolute bottom-0"
      style={{ fontSize: '7px', right: '5px' }}
    >
      v{ENV.VERSION}
    </div>
  );
}

export default Version;
