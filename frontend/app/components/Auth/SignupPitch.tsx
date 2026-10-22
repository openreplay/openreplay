import { Mark } from '@/ui/illustrations/Mark';
import { Stacks } from '@/ui/illustrations/Stacks';
import { useTranslation } from 'react-i18next';

/** The cloud signup's column beside the card: the free allowance and what you
 *  get, and the agents on their session bricks in the corner. */
export function SignupPitch() {
  const { t } = useTranslation();
  return (
    <>
      <Stacks className="m-auth__city" />
      <aside className="m-auth__pitch m-step-in">
        <h2 className="m-auth__pitch-title">
          {t('Start with 1,000 recordings a month, free.')}
        </h2>
        <ul className="m-auth__pitch-list">
          <li>
            <Mark kind="recordings" width={40} className="m-auth__pitch-icon" />
            {t('Replay every session, with its console and network beside it.')}
          </li>
          <li>
            <Mark kind="noMatch" width={40} className="m-auth__pitch-icon" />
            {t('Search by what people did, and keep the search as a segment.')}
          </li>
          <li>
            <Mark kind="synthetics" width={40} className="m-auth__pitch-icon" />
            {t(
              'Agents that find the issues, write the tests and audit the pages.',
            )}
          </li>
        </ul>
        <p className="m-auth__pitch-note">
          {t('No card needed. Set up billing when you need more.')}
        </p>
      </aside>
    </>
  );
}
