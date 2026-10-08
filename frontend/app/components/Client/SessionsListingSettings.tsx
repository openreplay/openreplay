import { Button } from '@/ui/actions/button';
import { NumberInput } from '@/ui/inputs/number-input';
import { SimpleSelect } from '@/ui/inputs/select';
import { Segmented } from '@/ui/inputs/toggle-group';
import { useToast } from '@/ui/overlays/toast';
import withPageTitle from 'HOCs/withPageTitle';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { KEY as DEBUG_KEY, options as devOptions } from 'App/dev/console';
import { useStore } from 'App/mstore';

import { inactivitySettingKey } from 'Shared/SessionSettings/components/InactivitySettings';

import {
  PrefBlock,
  PrefField,
  PrefList,
  PrefListRow,
  PrefToggle,
} from './PrefSection';

const readDebug = () => {
  try {
    return !!JSON.parse(localStorage.getItem(DEBUG_KEY) ?? '{}').verbose;
  } catch {
    return false;
  }
};

function SessionsListingSettings() {
  const { t } = useTranslation();
  const { settingsStore } = useStore();
  const s = settingsStore.sessionSettings;
  const [skipDom, setSkipDom] = React.useState(
    () => localStorage.getItem(inactivitySettingKey) === 'true',
  );
  const [debug, setDebug] = React.useState(readDebug);

  return (
    <>
      <ListingVisibility />
      <PrefBlock
        title={t('Where a replay starts')}
        hint={t(
          'Opening a session with a known problem takes you straight to it.',
        )}
      >
        <PrefToggle
          checked={!!s.skipToIssue}
          onChange={(v) => s.updateKey('skipToIssue', v)}
          label={
            s.skipToIssue
              ? t('Start at the first issue')
              : t('Start at the beginning')
          }
        />
      </PrefBlock>
      <Timezone />
      <PrefBlock
        flush
        title={t('While you watch')}
        hint={t('Small things about how a replay behaves.')}
      >
        <PrefList>
          <PrefListRow
            title={t('Mouse trail')}
            sub={t(
              'Draw the path the cursor took, so activity is visible at a glance.',
            )}
            control={
              <PrefToggle
                checked={!!s.mouseTrail}
                onChange={(v) => s.updateKey('mouseTrail', v)}
                label={s.mouseTrail ? t('On') : t('Off')}
              />
            }
          />
          <PrefListRow
            title={t('Skip inactivity')}
            sub={t(
              'Ignore DOM changes when deciding what counts as idle. Useful when your app animates while nobody is there.',
            )}
            control={
              <PrefToggle
                checked={skipDom}
                onChange={(v) => {
                  setSkipDom(v);
                  localStorage.setItem(
                    inactivitySettingKey,
                    v ? 'true' : 'false',
                  );
                }}
                label={skipDom ? t('On') : t('Off')}
              />
            }
          />
          <PrefListRow
            title={t('Virtual mode')}
            sub={t(
              'For apps built on light DOM - Lightning Web Components and similar custom element libraries.',
            )}
            control={
              <PrefToggle
                checked={!!s.virtualMode}
                onChange={(v) => s.updateKey('virtualMode', v)}
                label={s.virtualMode ? t('On') : t('Off')}
              />
            }
          />
          <PrefListRow
            title={t('Debug log')}
            sub={t(
              "Print the player's own diagnostics to your console. For support requests.",
            )}
            control={
              <PrefToggle
                checked={debug}
                onChange={(v) => {
                  setDebug(v);
                  devOptions.logStuff(v);
                }}
                label={debug ? t('On') : t('Off')}
              />
            }
          />
        </PrefList>
      </PrefBlock>
    </>
  );
}

const ListingVisibility = observer(() => {
  const { t } = useTranslation();
  const toast = useToast();
  const { settingsStore } = useStore();
  const s = settingsStore.sessionSettings;
  const [draft, setDraft] = React.useState({ ...s.durationFilter });
  const changed =
    JSON.stringify(draft) !== JSON.stringify({ ...s.durationFilter });
  const count = Number(draft.count) || undefined;

  return (
    <PrefBlock
      title={t('Which sessions are listed')}
      hint={t(
        'A recording shorter than a few seconds is usually a bounce, not a session.',
      )}
    >
      <PrefField
        wide
        note={t('Leave the number empty to list every recording.')}
      >
        <div className="m-pref__row">
          <span className="m-pref__hint">{t('Hide sessions')}</span>
          <SimpleSelect<string>
            value={draft.operator || '<'}
            ariaLabel={t('Duration comparison')}
            onChange={(v) => setDraft({ ...draft, operator: v ?? '<' })}
            options={[
              { value: '<', label: t('shorter than') },
              { value: '>', label: t('longer than') },
            ]}
            className="m-pref__w-sm"
          />
          <NumberInput
            value={count}
            min={0}
            max={9999}
            placeholder="10"
            aria-label={t('Duration')}
            onChange={(v) => setDraft({ ...draft, count: v && v > 0 ? v : '' })}
            className="m-pref__w-xs"
          />
          <SimpleSelect<string>
            value={draft.countType || 'sec'}
            ariaLabel={t('Duration unit')}
            onChange={(v) => setDraft({ ...draft, countType: v ?? 'sec' })}
            options={[
              { value: 'sec', label: t('seconds') },
              { value: 'min', label: t('minutes') },
            ]}
            className="m-pref__w-sm"
          />
          <Button
            disabled={!changed}
            onClick={() => {
              s.updateKey('durationFilter', draft);
              toast.success(
                t('Listing visibility settings saved successfully'),
              );
            }}
          >
            {t('Update')}
          </Button>
        </div>
      </PrefField>
    </PrefBlock>
  );
});

const Timezone = observer(() => {
  const { t } = useTranslation();
  const toast = useToast();
  const { settingsStore } = useStore();
  const s = settingsStore.sessionSettings;
  const options = s.defaultTimezones;
  const current = s.timezone?.value ?? 'system';

  const useMine = () => {
    const mins = -new Date().getTimezoneOffset();
    const sign = mins < 0 ? '-' : '+';
    const hh = String(Math.floor(Math.abs(mins) / 60)).padStart(2, '0');
    const mm = Math.abs(mins) % 60;
    const value = `UTC${sign}${hh}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`;
    const hit = options.find((o) => o.value === value);
    if (hit) {
      s.updateTimezone(hit, true);
      toast.success(t('Using the time zone you are in'));
    }
  };

  return (
    <PrefBlock
      title={t('Time zone')}
      hint={t('Which clock the session list and the play bar are read in.')}
    >
      <PrefField wide>
        <Segmented<'local' | 'user'>
          value={s.shownTimezone}
          onChange={(v) => s.updateKey('shownTimezone', v)}
          ariaLabel={t('Which clock')}
          options={[
            { value: 'local', label: t('Yours') },
            { value: 'user', label: t("The end user's") },
          ]}
        />
      </PrefField>
      {s.shownTimezone === 'local' ? (
        <PrefField
          label={t('Your time zone')}
          note={t(
            'Every session time, chart and export is referenced to this.',
          )}
        >
          <div className="m-pref__row">
            <SimpleSelect<string>
              value={current}
              ariaLabel={t('Your time zone')}
              onChange={(v) => {
                const hit = options.find((o) => o.value === v);
                if (!hit) return;
                s.updateTimezone(hit);
                toast.success(t('Default timezone saved successfully'));
              }}
              options={options.map((o) => ({ value: o.value, label: o.label }))}
              className="m-pref__w-md"
            />
            <Button variant="subtle" onClick={useMine}>
              {t('Use mine')}
            </Button>
          </div>
        </PrefField>
      ) : null}
    </PrefBlock>
  );
});

export default withPageTitle('Session Settings - OpenReplay Preferences')(
  observer(SessionsListingSettings),
);
