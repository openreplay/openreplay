import { IconButton } from '@/ui/actions/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Switch } from '@/ui/inputs/switch';
import { SPEED_OPTIONS } from 'Player/player/Player';
import {
  Check,
  FastForward,
  Gauge,
  Keyboard,
  type LucideIcon,
  Settings2,
  SplinePointer,
  StepForward,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { SKIP_INTERVALS } from 'App/player-ui/clock';
import { useModal } from 'Components/ModalContext';
import { ShortcutGrid } from 'Components/Session_/Player/Controls/components/KeyboardHelp';

import './replay-timeline.css';

export { SKIP_INTERVALS };

/** One button for every playback preference; non-default ones show as tags. */
function PlaybackSettings({
  disabled,
  mobile,
}: {
  disabled?: boolean;
  /** native app replays have no cursor, so no trail */
  mobile?: boolean;
}) {
  const { t } = useTranslation();
  const { player, store } = React.useContext(PlayerContext);
  const { uiPlayerStore, settingsStore } = useStore();
  const { openModal } = useModal();
  const { speed, skip, autoplay } = store.get();
  const { mouseTrail } = settingsStore.sessionSettings;
  const { skipInterval, changeSkipInterval } = uiPlayerStore;

  const switches: {
    key: string;
    label: string;
    hint?: string;
    icon: LucideIcon;
    on: boolean;
    tag?: string;
    toggle: () => void;
  }[] = [
    {
      key: 'skip',
      label: t('Skip inactivity'),
      icon: FastForward,
      on: skip,
      tag: skip ? t('Skip') : undefined,
      toggle: () => player.toggleSkip(),
    },
    ...(mobile
      ? []
      : [
          {
            key: 'trail',
            label: t('Mouse trail'),
            hint: t('Applies from the next session'),
            icon: SplinePointer,
            on: mouseTrail,
            tag: mouseTrail ? undefined : t('No trail'),
            toggle: () =>
              settingsStore.sessionSettings.updateKey(
                'mouseTrail',
                !mouseTrail,
              ),
          },
        ]),
    {
      key: 'autoplay',
      label: t('Autoplay next session'),
      icon: StepForward,
      on: autoplay,
      tag: autoplay ? t('Autoplay') : undefined,
      toggle: () => player.toggleAutoplay(),
    },
  ];

  // a badge is a setting off its default; clicking it puts it back
  const tags = [
    ...(speed !== 1
      ? [
          {
            key: 'speed',
            icon: Gauge,
            text: `${speed}×`,
            mono: true,
            title: t('Play at {{n}}×', { n: 1 }),
            reset: () => player.toggleSpeed(SPEED_OPTIONS.indexOf(1)),
          },
        ]
      : []),
    ...switches
      .filter((x) => x.tag)
      .map((x) => ({
        key: x.key,
        icon: x.icon,
        text: x.tag!,
        mono: false,
        title: [
          x.on
            ? t('Turn off: {{name}}', { name: x.label })
            : t('Turn on: {{name}}', { name: x.label }),
          x.hint,
        ]
          .filter(Boolean)
          .join('. '),
        reset: x.toggle,
      })),
  ];
  const label = tags.length
    ? t('Playback settings · {{list}}', {
        list: tags.map((x) => x.text).join(', '),
      })
    : t('Playback settings');

  return (
    <span className="m-tl__settings">
      {tags.length > 0 && (
        <span className="m-tl__tags">
          {tags.map((x) => (
            <button
              key={x.key}
              type="button"
              className="m-tl__tag"
              data-setting={x.key}
              title={x.title}
              aria-label={`${x.text}. ${x.title}`}
              disabled={disabled}
              onClick={x.reset}
            >
              <x.icon size={11} aria-hidden="true" />
              <span className={x.mono ? 'm-mono' : undefined}>{x.text}</span>
            </button>
          ))}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <span className="m-tl__settings-hit">
            <IconButton
              icon={<Settings2 size={14} />}
              label={label}
              variant="ghost"
            />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="m-tl__menu">
          <p className="m-tl__menu-head">{t('Speed')}</p>
          {SPEED_OPTIONS.map((s, i) => (
            <DropdownMenuItem
              key={s}
              role="menuitemradio"
              aria-checked={speed === s}
              onSelect={(e) => {
                e.preventDefault();
                player.toggleSpeed(i);
              }}
            >
              <span className="m-tl__menu-check">
                {speed === s && <Check size={12} aria-hidden="true" />}
              </span>
              <span className="m-mono">{s}×</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <p className="m-tl__menu-head">{t('Jump by')}</p>
          <div className="m-tl__menu-row">
            {Object.keys(SKIP_INTERVALS).map((k) => (
              <button
                key={k}
                type="button"
                className={`m-tl__chip${Number(k) === skipInterval ? ' is-on' : ''}`}
                onClick={() => changeSkipInterval(Number(k) as any)}
              >
                {k}s
              </button>
            ))}
          </div>
          <DropdownMenuSeparator />
          {switches.map((s) => (
            <DropdownMenuItem
              key={s.key}
              role="menuitemcheckbox"
              aria-checked={s.on}
              className="m-tl__menu-switch"
              title={s.hint}
              onSelect={(e) => {
                e.preventDefault();
                s.toggle();
              }}
            >
              <span className="m-tl__menu-word">
                <s.icon
                  size={13}
                  aria-hidden="true"
                  className="m-tl__menu-icon"
                />
                {s.label}
              </span>
              <Switch checked={s.on} tabIndex={-1} aria-hidden="true" />
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              openModal(<ShortcutGrid />, {
                width: 320,
                title: t('Keyboard Shortcuts'),
              })
            }
          >
            <Keyboard
              size={13}
              aria-hidden="true"
              className="m-tl__menu-icon"
            />
            {t('Keyboard shortcuts')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

export default observer(PlaybackSettings);
