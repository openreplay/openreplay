import { Button } from '@/ui/actions/button';
import { DrawerHeader, Section } from '@/ui/overlays/EntityDrawer';
import {
  BookOpen,
  Circle,
  CircleCheck,
  Code2,
  Plug,
  UserRound,
  Users,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { Step } from 'App/mstore/types/gettingStarted';
import { onboarding as onboardingRoute, withSiteId } from 'App/routes';
import { useNavigate } from 'App/routing';

import './getting-started.css';

const STEP_ICON: Record<string, typeof Code2> = {
  installing: Code2,
  'identify-users': UserRound,
  team: Users,
  integrations: Plug,
};

/* step titles carry an emoji from the API mapping; the row has its own glyph */
const plainTitle = (title: string) => title.replace(/^[^\p{L}\p{N}]+/u, '');

function GettingStartedModal() {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const navigate = useNavigate();
  const {
    settingsStore: { gettingStarted },
    projectsStore,
  } = useStore();
  const { steps } = gettingStarted;
  const pending = steps.filter((s) => s.status === 'pending');
  const done = steps.filter((s) => s.status !== 'pending');

  const go = (step: Step) => {
    hideModal();
    navigate(
      withSiteId(onboardingRoute(step.url), projectsStore.getSiteId().siteId!),
    );
  };

  const list = (items: Step[]) => (
    <ul className="m-setup">
      {items.map((step) => (
        <StepRow
          key={step.title}
          step={step}
          onOpen={() => go(step)}
          onIgnore={() => gettingStarted.completeStep(step)}
        />
      ))}
    </ul>
  );

  return (
    <div className="m-drawer__pane">
      <header className="m-drawer__head">
        <DrawerHeader
          title={t('Set up OpenReplay')}
          meta={t(
            'Find all the ways in which OpenReplay can benefit you and your product.',
          )}
          onClose={hideModal}
        />
      </header>
      <div className="m-drawer__body">
        {pending.length > 0 && (
          <Section title={t('To do · {{n}}', { n: pending.length })}>
            {list(pending)}
          </Section>
        )}
        {done.length > 0 && (
          <Section title={t('Done · {{n}}', { n: done.length })}>
            {list(done)}
          </Section>
        )}
      </div>
    </div>
  );
}

function StepRow({
  step,
  onOpen,
  onIgnore,
}: {
  step: Step;
  onOpen: () => void;
  onIgnore: () => void;
}) {
  const { t } = useTranslation();
  const isDone = step.status !== 'pending';
  const Icon = STEP_ICON[step.url] ?? Circle;
  return (
    <li className={`m-setup__step${isDone ? ' is-done' : ''}`}>
      <span className="m-setup__icon" aria-hidden="true">
        {isDone ? <CircleCheck size={16} /> : <Icon size={16} />}
      </span>
      <div className="m-setup__text">
        {isDone ? (
          <span className="m-setup__title">{plainTitle(step.title)}</span>
        ) : (
          <button type="button" className="m-setup__title" onClick={onOpen}>
            {plainTitle(step.title)}
          </button>
        )}
        <span className="m-setup__desc">{step.description}</span>
      </div>
      <div className="m-setup__actions">
        {step.docsLink && (
          <Button
            variant="subtle"
            size="sm"
            onClick={() => window.open(step.docsLink, '_blank', 'noopener')}
          >
            <BookOpen size={13} />
            {t('Docs')}
          </Button>
        )}
        {!isDone && (
          <Button variant="subtle" size="sm" onClick={onIgnore}>
            {t('Ignore')}
          </Button>
        )}
      </div>
    </li>
  );
}

export default observer(GettingStartedModal);
