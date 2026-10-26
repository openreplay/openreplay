import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  type ScrollReach,
  reachGradient,
} from 'Components/Dashboard/Widgets/CustomMetricsWidgets/ClickMapCard/scrollReach';

/**
 * The page tinted by how many sessions reached each depth, the fold, and the
 * lines where the readers fall to 75, 50 and 25%. Positioned in percent of the
 * page, so it sits in the replay's screen and in the minimap alike.
 */
export function ScrollLayer({
  reach,
  labels,
}: {
  reach: ScrollReach;
  labels: boolean;
}) {
  const { t } = useTranslation();
  return (
    // drawn over the recorded site, which is light whatever the app's theme
    <div
      className="m-cmap__layer m-scheme-light"
      aria-hidden={labels ? undefined : true}
    >
      <span
        className="m-cmap__reach"
        style={{ background: reachGradient(reach.reach) }}
      />
      <span className="m-cmap__mark is-fold" style={{ top: `${reach.fold}%` }}>
        {labels && <span className="m-cmap__mark-label">{t('Fold')}</span>}
      </span>
      {reach.marks.map((m) => (
        <span
          key={m.share}
          className="m-cmap__mark"
          style={{ top: `${m.depth}%` }}
        >
          {labels && (
            <span className="m-cmap__mark-label">
              {t('{{share}}% reached', { share: m.share })}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
