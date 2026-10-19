import { ArmadaMark } from '@/ui/brand/ArmadaMark';
import { MonitorPlay, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** The cloud signup's column beside the card: the free allowance and what you get. */
export function SignupPitch() {
  const { t } = useTranslation();
  return (
    <aside className="m-auth__pitch m-step-in">
      <h2 className="m-auth__pitch-title">
        {t('Start with 1,000 recordings a month, free.')}
      </h2>
      <ul className="m-auth__pitch-list">
        <li>
          <span className="m-auth__pitch-icon" aria-hidden="true">
            <MonitorPlay size={16} />
          </span>
          {t('Replay every session, with its console and network beside it.')}
        </li>
        <li>
          <span className="m-auth__pitch-icon" aria-hidden="true">
            <Search size={16} />
          </span>
          {t('Search by what people did, and keep the search as a segment.')}
        </li>
        <li>
          <span className="m-auth__pitch-icon" aria-hidden="true">
            <ArmadaMark size={16} />
          </span>
          {t(
            'Agents that find the issues, write the tests and audit the pages.',
          )}
        </li>
      </ul>
      <p className="m-auth__pitch-note">
        {t('No card needed. Set up billing when you need more.')}
      </p>
    </aside>
  );
}
