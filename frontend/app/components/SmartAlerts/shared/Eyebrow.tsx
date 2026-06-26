import React from 'react';

/* Small uppercase section label used across the detail/player surfaces
   ("The problem", "This session", …). */
export default function Eyebrow({ text }: { text: string }) {
  return (
    <span
      className="text-xs font-semibold uppercase color-gray-medium"
      style={{ letterSpacing: '0.05em' }}
    >
      {text}
    </span>
  );
}
