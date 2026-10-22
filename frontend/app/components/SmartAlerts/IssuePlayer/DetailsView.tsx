import { Chip } from '@/ui/data/Chip';
import React from 'react';
import { useTranslation } from 'react-i18next';

import 'Components/Session/ReplayScreen/journey-panel.css';

import { type Issue } from '../shared';

/** The problem, the suggested fix once the backend provides one, and the
 *  session's journey tags (on a long journey, tags on the steps get lost). */
export default function DetailsView({
  issue,
  tags,
}: {
  issue: Issue;
  tags?: string[];
}) {
  const { t } = useTranslation();
  return (
    <div className="m-jrn__answers">
      <section className="m-jrn__answer">
        <h3>{t('The problem')}</h3>
        <p>{issue.problem || t('No description yet.')}</p>
      </section>
      {issue.fix && (
        <section className="m-jrn__answer">
          <h3>{t('Suggested fix')}</h3>
          <p>{issue.fix}</p>
        </section>
      )}
      {tags && tags.length > 0 && (
        <section className="m-jrn__answer">
          <h3>{t('Tags')}</h3>
          <div className="m-jrn__tags">
            {tags.map((tag) => (
              <Chip key={tag} kind="tag">
                {tag}
              </Chip>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
