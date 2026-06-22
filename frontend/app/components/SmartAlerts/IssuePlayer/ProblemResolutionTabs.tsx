import { Segmented } from 'antd';
import React from 'react';

import type { Issue } from '../shared';

/* The problem + the suggested fix as two tabs in one card. Both degrade to a
   placeholder until the backend provides the text. */
export default function ProblemResolutionTabs({ issue }: { issue: Issue }) {
  const [view, setView] = React.useState<'problem' | 'fix'>('problem');
  const text =
    view === 'problem'
      ? issue.real || 'No description yet.'
      : issue.fix || 'No suggestion yet.';
  return (
    <div className="rounded-lg border border-gray-light overflow-hidden">
      <div className="p-2 border-b border-gray-light">
        <Segmented
          block
          value={view}
          onChange={(v) => setView(v as 'problem' | 'fix')}
          options={[
            { label: 'The problem', value: 'problem' },
            { label: 'Suggested fix', value: 'fix' },
          ]}
        />
      </div>
      <div className="p-3">
        <span
          className="color-gray-dark leading-relaxed"
          style={{ fontSize: 15 }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}
