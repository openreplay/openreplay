import { ProgressBar } from '@/ui/data/ProgressBar';
import { Tooltip } from '@/ui/overlays/tooltip';
import { ListChecks } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';

import 'Shared/RecordingsMeter/recordings-meter.css';

import GettingStartedModal from './GettingStartedModal';
import './getting-started.css';

/** The nav's setup meter; opens the checklist until every step is done or ignored. */
/** `compact`: the collapsed rail's tool button, same drawer. */
function GettingStartedProgress({ compact = false }: { compact?: boolean }) {
  const { showModal } = useModal();
  const { t } = useTranslation();
  const {
    settingsStore: { gettingStarted },
    userStore,
  } = useStore();
  const { isLoggedIn } = userStore;
  const account = userStore.account.email;

  useEffect(() => {
    if (isLoggedIn && account) gettingStarted.fetchData(account);
  }, [isLoggedIn, account]);

  if (gettingStarted.status === 'completed' || !gettingStarted.steps.length) {
    return null;
  }
  const done = gettingStarted.steps.length - gettingStarted.numPending;
  const openChecklist = () =>
    showModal(<GettingStartedModal />, { right: true });
  if (compact) {
    return (
      <Tooltip
        title={t('Setup {{done}} / {{total}}', {
          done,
          total: gettingStarted.steps.length,
        })}
        side="right"
      >
        <button
          type="button"
          className="m-nav__tool"
          aria-label={t('Setup')}
          onClick={openChecklist}
        >
          <ListChecks size={15} aria-hidden="true" />
          <span className="m-dot" />
        </button>
      </Tooltip>
    );
  }
  return (
    <button
      type="button"
      className="m-meter m-setup-meter"
      onClick={openChecklist}
    >
      <span className="m-meter__label">{t('Setup')}</span>
      <ProgressBar
        value={gettingStarted.percentageCompleted}
        label={t('{{pct}}% of setup done', {
          pct: gettingStarted.percentageCompleted,
        })}
      />
      <span className="m-meter__value">
        {done} / {gettingStarted.steps.length}
      </span>
    </button>
  );
}

export default observer(GettingStartedProgress);
