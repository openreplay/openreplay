import { CodeBlock } from '@/ui/data/CodeBlock';
import { Checkbox } from '@/ui/inputs/checkbox';
import { SimpleSelect } from '@/ui/inputs/select';
import { Switch } from '@/ui/inputs/switch';
import { Segmented } from '@/ui/inputs/toggle-group';
import { Step } from '@/ui/layout/Steps';
import { ChevronDown } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import type Project from 'App/mstore/types/project';

import {
  ASSIST_INSTALL,
  ASSIST_USE,
  DOCS,
  INPUT_MODES,
  type InputMode,
  type InstallMethod,
  PLATFORMS,
  type Platform,
  installCommand,
  mobileSteps,
  snippetPlacement,
  trackerSnippet,
} from './install';
import './onboarding.css';

interface Props {
  project: Project;
  /** Which platforms the switch offers; one hides it. */
  platforms: Platform[];
  platform: Platform;
  onPlatform: (p: Platform) => void;
  /** The project's Installation page shows every step; the first run, two. */
  full?: boolean;
  onCopied?: () => void;
  /** Controlled when the host needs it too (the identify snippet does). */
  method?: InstallMethod;
  onMethod?: (m: InstallMethod) => void;
}

/** Install and start the tracker, with the project's own key and privacy. */
function InstallGuide({
  project,
  platforms,
  platform,
  onPlatform,
  full,
  onCopied,
  method: methodProp,
  onMethod,
}: Props) {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const [ownMethod, setOwnMethod] = React.useState<InstallMethod>('npm');
  const method = methodProp ?? ownMethod;
  const setMethod = onMethod ?? setOwnMethod;
  const [ssr, setSsr] = React.useState(false);
  const [assist, setAssist] = React.useState(false);
  const [privacyOpen, setPrivacyOpen] = React.useState(false);
  const gdpr: any = project.gdpr ?? {};
  const inputMode = (gdpr.defaultInputMode ?? 'plain') as InputMode;
  const maskNumbers = !!gdpr.maskNumbers;
  const maskEmails = !!gdpr.maskEmails;

  const setGdpr = (patch: Record<string, unknown>) => {
    if (projectsStore.instance?.id !== project.id)
      projectsStore.initProject(project);
    projectsStore.editGDPR(patch);
    void projectsStore.saveGDPR(project.id!);
  };

  const opts = {
    projectKey: project.projectKey ?? '',
    host: project.host || project.name || 'your app',
    platform,
    method,
    ssr,
    inputMode,
    maskNumbers,
    maskEmails,
    assist,
  };
  const language = PLATFORMS.find((p) => p.key === platform)!.language;
  const install = installCommand(platform);
  const isWeb = platform === 'web';
  const showInstall = !isWeb || method === 'npm';
  const privacySummary = [
    t(INPUT_MODES.find((m) => m.value === inputMode)?.label ?? ''),
    [maskNumbers && t('numbers'), maskEmails && t('emails')].filter(Boolean)
      .length
      ? t('masking {{list}}', {
          list: [maskNumbers && t('numbers'), maskEmails && t('emails')]
            .filter(Boolean)
            .join(t(' and ')),
        })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  let n = 0;
  const next = () => (n += 1);

  return (
    <div className="m-ob__stack">
      {(platforms.length > 1 || isWeb) && (
        <div className="m-ob__controls">
          {platforms.length > 1 && (
            <Segmented
              value={platform}
              onChange={(v) => onPlatform(v as Platform)}
              ariaLabel={t('Platform')}
              options={PLATFORMS.filter((p) => platforms.includes(p.key)).map(
                (p) => ({ value: p.key, label: p.label }),
              )}
            />
          )}
          {isWeb && (
            <label className="m-ob__switch">
              <Switch
                checked={method === 'script'}
                onCheckedChange={(v) => setMethod(v ? 'script' : 'npm')}
                aria-label={t('Install with a script tag')}
              />
              {t('Install with a script tag')}
            </label>
          )}
        </div>
      )}

      {showInstall && (
        <Step
          n={next()}
          title={isWeb ? t('Install the package') : t('Install the SDK')}
        >
          {isWeb ? (
            <CodeBlock
              code={install.code}
              inline
              copyLabel={t('Copy command')}
            />
          ) : (
            <CodeBlock
              code={install.code}
              language={install.language}
              caption={install.via}
            />
          )}
        </Step>
      )}

      <Step
        n={showInstall ? next() : undefined}
        title={
          isWeb && method === 'script'
            ? t('Paste the snippet')
            : t('Start the tracker')
        }
        aside={
          isWeb && method === 'npm' ? (
            <label className="m-ob__switch">
              <Switch
                checked={ssr}
                onCheckedChange={setSsr}
                aria-label={t('Server-side rendered')}
              />
              {t('Server-side rendered')}{' '}
              <span className="m-ob__muted">(Next, Nuxt)</span>
            </label>
          ) : undefined
        }
      >
        <CodeBlock
          code={trackerSnippet(opts)}
          language={method === 'script' && isWeb ? 'HTML' : language}
          caption={t(snippetPlacement(platform, method))}
          highlight={project.projectKey}
          onCopied={onCopied}
          copyLabel={t('Copy snippet')}
        />
        {isWeb && (
          <div className={`m-ob__privacy${privacyOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="m-ob__disclose m-hover"
              onClick={() => setPrivacyOpen((o) => !o)}
              aria-expanded={privacyOpen}
            >
              <ChevronDown
                size={14}
                className="m-ob__chev"
                aria-hidden="true"
              />
              <span>{t('Privacy options')}</span>
              <span className="m-ob__muted">{privacySummary}</span>
            </button>
            {privacyOpen && (
              <div className="m-ob__privacy-row m-step-in">
                <label className="m-ob__field-inline">
                  <span className="m-ob__muted">{t('Inputs')}</span>
                  <SimpleSelect<InputMode>
                    value={inputMode}
                    onChange={(v) => v && setGdpr({ defaultInputMode: v })}
                    options={INPUT_MODES.map((m) => ({
                      value: m.value,
                      label: t(m.label),
                    }))}
                    ariaLabel={t('Default input mode')}
                    className="m-ob__select"
                  />
                </label>
                <label className="m-ob__check">
                  <Checkbox
                    checked={maskNumbers}
                    onCheckedChange={(v) =>
                      setGdpr({ maskNumbers: v === true })
                    }
                  />
                  {t('Do not record any numeric text')}
                </label>
                <label className="m-ob__check">
                  <Checkbox
                    checked={maskEmails}
                    onCheckedChange={(v) => setGdpr({ maskEmails: v === true })}
                  />
                  {t('Do not record email addresses')}
                </label>
              </div>
            )}
          </div>
        )}
        {full && isWeb && method === 'npm' && (
          <p className="m-ob__muted text-xs">
            {t('Learn more about available options')}{' '}
            <a
              className="m-ob__link"
              href={DOCS.options}
              target="_blank"
              rel="noreferrer"
            >
              {t('in the docs')}
            </a>
            .
          </p>
        )}
        {full && isWeb && method === 'script' && (
          <p className="m-ob__muted text-xs">
            {t('Also available through')}{' '}
            <a
              className="m-ob__link"
              href={DOCS.gtm}
              target="_blank"
              rel="noreferrer"
            >
              Google Tag Manager
            </a>
            .
          </p>
        )}
      </Step>

      {full && isWeb && (
        <Step
          n={next()}
          title={
            <>
              {t('Enable Assist')}{' '}
              <span className="m-ob__muted">{t('optional')}</span>
            </>
          }
          aside={
            method === 'script' ? (
              <label className="m-ob__switch">
                <Switch
                  checked={assist}
                  onCheckedChange={setAssist}
                  aria-label={t('Enable Assist')}
                />
                {t('Include Assist in the snippet')}
              </label>
            ) : undefined
          }
        >
          {method === 'npm' ? (
            <>
              <CodeBlock
                code={ASSIST_INSTALL}
                inline
                copyLabel={t('Copy command')}
              />
              <CodeBlock
                code={ASSIST_USE}
                language="JavaScript"
                caption={
                  <>
                    {t('Then enable it with your tracker.')}{' '}
                    <a
                      className="m-ob__link"
                      href={DOCS.assist}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('Options')}
                    </a>
                  </>
                }
              />
            </>
          ) : (
            <p className="m-ob__muted text-xs">
              {t(
                'Assist lets you see a user’s live screen and call them, with no screen-sharing software on their side.',
              )}
            </p>
          )}
        </Step>
      )}

      {full &&
        !isWeb &&
        mobileSteps(platform).map((s) => (
          <Step key={s.title} n={next()} title={t(s.title)}>
            <CodeBlock
              code={s.code}
              language={s.language}
              caption={s.hint ? t(s.hint) : undefined}
            />
          </Step>
        ))}
    </div>
  );
}

export default observer(InstallGuide);
