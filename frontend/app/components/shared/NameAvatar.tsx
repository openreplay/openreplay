import React from 'react';
import { getInitials } from 'App/utils';

function NameAvatar({ name, size }: { name: string; size?: number }) {
  const onlyLetterName = name.replace(/[^a-zA-Z\s]/g, '');
  const fontSize = size ? Math.floor((size / 32) * 14) : 14;
  return (
    <div
      className="bg-tealx-light rounded-full flex items-center justify-center color-tealx"
      style={{ width: size ?? '32px', height: size ?? '32px', fontSize }}
    >
      {getInitials(onlyLetterName)}
    </div>
  );
}

export default NameAvatar;
