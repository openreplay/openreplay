import { useTranslation } from 'react-i18next';

import { ruleParts } from './catalogue';
import type { SearchFilter } from './types';

/** The collapsed filter: its rules as read-only pills, `max` of them, then "+N more". */
export function RuleSummary({
  rules,
  max = 3,
}: {
  rules: readonly SearchFilter[];
  max?: number;
}) {
  const { t } = useTranslation();
  const shown = rules.slice(0, max);
  const more = rules.length - shown.length;
  return (
    <span className="m-rulesum">
      {shown.map((f) => {
        const { name, rest } = ruleParts(t, f);
        return (
          <span key={f.key} className="m-rulesum__pill">
            <span className="m-rulesum__name">{name}</span>
            {rest && <span className="m-rulesum__rest">{rest}</span>}
          </span>
        );
      })}
      {more > 0 && (
        <span className="m-rulesum__more">
          {t('+{{count}} more', { count: more })}
        </span>
      )}
    </span>
  );
}
