import React from 'react';
import { useTranslation } from 'react-i18next';

import 'Components/Session/ReplayScreen/journey-panel.css';

import { type Issue } from '../shared';

/** The problem, and the suggested fix once the backend provides one. */
export default function DetailsView({ issue }: { issue: Issue }) {
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
    </div>
  );
}
