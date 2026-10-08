import withPageTitle from '@/components/hocs/withPageTitle';
import { Button } from '@/ui/actions/button';
import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import { Input } from '@/ui/inputs/input';
import { Stepper, type StepperStep } from '@/ui/layout/Stepper';
import '@/ui/layout/page-card.css';
import { useToast } from '@/ui/overlays/toast';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import User from 'App/mstore/types/user';
import {
  CLIENT_TABS,
  OB_TABS,
  client,
  onboarding as onboardingRoute,
  sessions,
  withSiteId,
} from 'App/routes';
import { useLocation, useNavigate } from 'App/routing';

import InstallGuide from './InstallGuide';
import { DOCS, type InstallMethod, type Platform } from './install';
import './onboarding.css';
import DoneStep, { type StepKey, type StepState } from './steps/DoneStep';
import IdentifyStep from './steps/IdentifyStep';
import InviteStep, {
  type Invite,
  canSend,
  newInvite,
} from './steps/InviteStep';

const ORDER: StepKey[] = ['install', 'identify', 'invite'];
const TAB: Record<StepKey | 'done', string> = {
  install: OB_TABS.INSTALLING,
  identify: OB_TABS.IDENTIFY_USERS,
  invite: OB_TABS.MANAGE_USERS,
  done: OB_TABS.DONE,
};
const stepOf = (tab: string): StepKey | null =>
  tab === OB_TABS.IDENTIFY_USERS
    ? 'identify'
    : tab === OB_TABS.MANAGE_USERS
      ? 'invite'
      : tab === OB_TABS.DONE || tab === OB_TABS.INTEGRATIONS
        ? null
        : 'install';

/** The first run: install, identify, invite, then the summary. */
function Onboarding() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectsStore, userStore, customFieldStore } = useStore();
  const siteId = projectsStore.siteId!;
  const site = projectsStore.list.find((p) => p.id === siteId);
  const tab = location.pathname.split('/onboarding/')[1]?.split('/')[0] ?? '';
  const step = stepOf(tab);
  const index = step ? ORDER.indexOf(step) : ORDER.length;

  const [name, setName] = React.useState(site?.name ?? '');
  const [nudged, setNudged] = React.useState(false);
  const projectRef = React.useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = React.useState<Platform>(
    site?.platform === 'ios' ? 'ios' : 'web',
  );
  const [method, setMethod] = React.useState<InstallMethod>('npm');
  const [visited, setVisited] = React.useState<Record<StepKey, StepState>>({
    install: 'ahead',
    identify: 'ahead',
    invite: 'ahead',
  });
  const [copied, setCopied] = React.useState(false);
  const [rows, setRows] = React.useState<Invite[]>(() => [newInvite()]);
  const [invited, setInvited] = React.useState<Invite[]>([]);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (site) {
      setName(site.name ?? '');
      setPlatform(site.platform === 'ios' ? 'ios' : 'web');
    }
  }, [site?.id]);

  React.useEffect(() => {
    if (!tab)
      navigate(withSiteId(onboardingRoute(OB_TABS.INSTALLING), siteId), {
        replace: true,
      });
  }, [tab, siteId]);

  const go = (key: StepKey | 'done') =>
    navigate(withSiteId(onboardingRoute(TAB[key]), siteId));

  // blur and Continue can both save: saves run one after another, and a save
  // for the name already saved / in flight is reused
  const renaming = React.useRef<{
    name: string;
    done: Promise<boolean>;
  } | null>(null);
  /** Resolves false when the rename failed, so the wizard can stay put. */
  const saveName = (): Promise<boolean> => {
    const next = name.trim();
    if (!site || !next) return Promise.resolve(true);
    if (renaming.current?.name === next) return renaming.current.done;
    const before = renaming.current?.done ?? Promise.resolve(true);
    const done = before.then(() => {
      const current = projectsStore.list.find((p) => p.id === site.id);
      if (!current || current.name === next) return true;
      return projectsStore
        .save({ ...current.toData(), name: next } as any)
        .then(() => true)
        .catch((e: any) => {
          toast.error(e?.message || t('Could not rename the project'));
          return false;
        });
    });
    const entry = { name: next, done };
    renaming.current = entry;
    // a failed attempt must not be reused by the next try with the same name
    void done.then((ok) => {
      if (!ok && renaming.current === entry) renaming.current = null;
    });
    return done;
  };

  const leave = () => {
    userStore.setOnboarding(true);
    navigate(withSiteId(sessions(), siteId));
  };

  const mark = (key: StepKey, state: StepState) =>
    setVisited((v) => ({ ...v, [key]: state }));

  const sendInvites = async () => {
    const out: Invite[] = [];
    setSending(true);
    for (const r of rows.filter(canSend)) {
      const user = new User().fromJson({
        name: r.name.trim() || r.email.trim(),
        email: r.email.trim(),
        admin: r.admin,
        roleId: r.roleId,
      });
      try {
        const resp = await userStore.saveUser(user);
        out.push({ ...r, invitationLink: resp?.invitationLink });
      } catch {
        // the store already toasts the reason
      }
    }
    setSending(false);
    setInvited((prev) => [...prev, ...out]);
    setRows([newInvite()]);
    return out.length;
  };

  const next = async () => {
    if (!step) return;
    if (step === 'install') {
      if (!name.trim()) {
        setNudged(true);
        projectRef.current?.focus();
        return;
      }
      if (!(await saveName())) return;
    }
    if (step === 'invite') {
      const n = await sendInvites();
      mark('invite', n || invited.length ? 'done' : 'skipped');
      go('done');
      return;
    }
    mark(step, 'done');
    go(ORDER[index + 1]);
  };

  const skip = () => {
    if (!step) return;
    mark(step, 'skipped');
    go(index === ORDER.length - 1 ? 'done' : ORDER[index + 1]);
  };

  const titles: Record<
    StepKey,
    { title: string; lede: string; ahead: string }
  > = {
    install: {
      title: t('Install the tracker'),
      lede: t('One snippet. Sessions start recording the moment it loads.'),
      ahead: t('Copy one snippet'),
    },
    identify: {
      title: t('Identify your users'),
      lede: t('So a session belongs to a person, not a browser.'),
      ahead: t('One call, plus metadata if you like'),
    },
    invite: {
      title: t('Invite your team'),
      lede: t(
        'Replays are for developers, designers and product managers alike.',
      ),
      ahead: t('Optional'),
    },
  };
  const metadataKeys = customFieldStore.list.map((f: any) => f.key as string);
  const hint = (key: StepKey) => {
    const state = visited[key];
    if (state === 'skipped') return t('Skipped for now');
    if (state !== 'done') return titles[key].ahead;
    if (key === 'install') return copied ? t('Snippet copied') : t('Done');
    if (key === 'identify')
      return metadataKeys.length
        ? t('User ID + {{n}} metadata keys', { n: metadataKeys.length })
        : t('User ID');
    return invited.length
      ? t('{{n}} invited', { n: invited.length })
      : t('Done');
  };
  const steps: StepperStep<StepKey>[] = ORDER.map((key) => ({
    key,
    label: titles[key].title,
    status: visited[key],
    hint: hint(key),
  }));
  const docs =
    step === 'install'
      ? DOCS[platform]
      : step === 'identify'
        ? DOCS.identify(platform)
        : step === 'invite'
          ? DOCS.invite
          : null;
  const nudge = nudged && !name.trim();

  if (!site) return null;

  return (
    <div className="m-ob" data-step={step ?? 'done'}>
      <header className="m-ob__top">
        <span className="m-ob__brand">
          <OpenReplayMark size={22} />
          <span className="m-ob__brand-name">OpenReplay</span>
        </span>
        {step && (
          <Button variant="subtle" onClick={leave} className="m-ob__skip">
            {t('Skip setup')}
          </Button>
        )}
      </header>

      <div className="m-ob__body">
        <aside className="m-ob__rail">
          <div className={`m-ob__project${nudge ? ' is-nudged' : ''}`}>
            <label className="m-ob__project-label" htmlFor="m-ob-project">
              {t('Project')}
            </label>
            <Input
              id="m-ob-project"
              ref={projectRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void saveName()}
              placeholder={t('Ex. app.acme.com')}
              aria-invalid={nudge || undefined}
              aria-describedby="m-ob-project-note"
            />
            <span
              className="m-ob__project-note"
              id="m-ob-project-note"
              role={nudge ? 'status' : undefined}
            >
              {nudge
                ? t('Name the project to continue.')
                : t(
                    'The site or app you are recording. The name is needed to continue.',
                  )}
            </span>
          </div>
          <Stepper
            steps={steps}
            current={step}
            onSelect={(k) => go(k)}
            ariaLabel={t('Setup steps')}
          />
          {docs && (
            <a
              className="m-ob__docs"
              href={docs}
              target="_blank"
              rel="noreferrer"
            >
              <BookOpen size={13} aria-hidden="true" />
              {t('Documentation for this step')}
            </a>
          )}
        </aside>

        <section className="m-ob__card m-panel" aria-labelledby="m-ob-title">
          <div className="m-ob__step m-step-in" key={step ?? 'done'}>
            {step ? (
              <header className="m-ob__head">
                <p className="m-ob__count">
                  {t('Step {{n}} of {{total}}', {
                    n: index + 1,
                    total: ORDER.length,
                  })}
                </p>
                <h1 className="m-ob__title" id="m-ob-title">
                  {titles[step].title}
                </h1>
                <p className="m-ob__lede">{titles[step].lede}</p>
              </header>
            ) : null}
            <div className="m-ob__content">
              {step === 'install' ? (
                <InstallGuide
                  project={site}
                  platforms={['web', 'ios', 'android']}
                  platform={platform}
                  onPlatform={setPlatform}
                  method={method}
                  onMethod={setMethod}
                  onCopied={() => setCopied(true)}
                />
              ) : step === 'identify' ? (
                <IdentifyStep
                  siteId={siteId}
                  platform={platform}
                  method={method}
                />
              ) : step === 'invite' ? (
                <InviteStep rows={rows} onRows={setRows} invited={invited} />
              ) : (
                <DoneStep
                  projectName={name.trim() || site.name}
                  siteId={siteId}
                  visited={visited}
                  metadataKeys={metadataKeys}
                  invited={invited}
                  onLeave={leave}
                  onIntegrations={() => {
                    userStore.setOnboarding(true);
                    navigate(client(CLIENT_TABS.INTEGRATIONS));
                  }}
                  onNewProject={() => {
                    userStore.setOnboarding(true);
                    navigate(client(CLIENT_TABS.SITES));
                  }}
                />
              )}
            </div>
            {step && (
              <footer className="m-ob__foot">
                <div className="m-ob__foot-left">
                  {index > 0 && (
                    <Button
                      variant="subtle"
                      onClick={() => go(ORDER[index - 1])}
                    >
                      <ArrowLeft size={14} />
                      {t('Back')}
                    </Button>
                  )}
                </div>
                <div className="m-ob__foot-right">
                  {step !== 'install' && (
                    <Button variant="subtle" onClick={skip}>
                      {t('I’ll do this later')}
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => void next()}
                    loading={sending}
                    className="m-ob__next"
                  >
                    {index === ORDER.length - 1
                      ? t('Finish setup')
                      : t('Continue')}
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </footer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default withPageTitle('Project Setup - OpenReplay')(
  observer(Onboarding),
);
