import React from 'react';

function Tag({ children }: { children: React.ReactNode }) {
  return <div className="px-2 bg-gray-lighter rounded-xl">{children}</div>;
}

export default Tag;
