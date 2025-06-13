import React from 'react';

function Version() {
  return (
    <div
      className="absolute bottom-0"
      style={{ fontSize: '7px', right: '5px' }}
    >
      v{window.env.VERSION}
    </div>
  );
}

export default Version;
