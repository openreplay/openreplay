import React from 'react';

import type { Issue } from '../shared';

const Eyebrow = ({ text }: { text: string }) => (
  <span
    className="text-xs font-semibold uppercase color-gray-medium"
    style={{ letterSpacing: '0.05em' }}
  >
    {text}
  </span>
);

/* Details tab — the issue described plainly, with the suggested fix folded in
   below (not its own tab: many issues have no clean fix, so it lives here as a
   secondary section). Both texts degrade to placeholders until the backend
   provides them. */
export default function DetailsView({ issue }: { issue: Issue }) {
  const text = 'color-gray-dark';
  const textStyle = { fontSize: 15, lineHeight: 1.65 };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Eyebrow text="The problem" />
        <span className={text} style={textStyle}>
          {issue.real || 'No description yet.'}
        </span>
      </div>
      {issue.fix && (
        <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-light">
          <Eyebrow text="Suggested fix" />
          <span className={text} style={textStyle}>
            {issue.fix}
          </span>
        </div>
      )}
    </div>
  );
}
