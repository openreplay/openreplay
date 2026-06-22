import React from 'react';

import { Icon } from 'UI';

/* Reusable "what happened" AI textbox. `primary` is the full tinted card used
   for the issue description; `secondary` is just the text with a sparkles mark,
   used inline per session. */
export default function AiSummary({
  children,
  variant = 'primary',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  if (variant === 'secondary') {
    return (
      <div className="flex items-start gap-1.5 text-sm leading-relaxed color-gray-dark">
        <Icon name="sparkles" size={13} className="shrink-0 mt-[3px]" />
        <div>{children}</div>
      </div>
    );
  }
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1.5 border border-gray-light"
      style={{
        background: 'linear-gradient(156deg, #F3F4FF 0%, #F1F8F8 100%)',
      }}
    >
      <span className="inline-flex items-center gap-1.5">
        <Icon name="sparkles" size={14} />
        <span className="text-xs font-semibold text-main">AI summary</span>
      </span>
      <div className="leading-relaxed color-gray-dark">{children}</div>
    </div>
  );
}
