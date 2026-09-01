import React from 'react';
import { useTranslation } from 'react-i18next';

import { Eyebrow, type Issue } from '../shared';

/* Details tab — the problem plainly, with the suggested fix below. Both degrade
   to placeholders until the backend provides them. */
export default function DetailsView({ issue }: { issue: Issue }) {
  const { t } = useTranslation();
  const text = 'color-gray-dark';
  const textStyle = { fontSize: 15, lineHeight: 1.65 };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Eyebrow text={t('The problem')} />
        <span className={text} style={textStyle}>
          {issue.problem || t('No description yet.')}
        </span>
      </div>
      {issue.fix && (
        <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-light">
          <Eyebrow text={t('Suggested fix')} />
          <span className={text} style={textStyle}>
            {issue.fix}
          </span>
        </div>
      )}
    </div>
  );
}
