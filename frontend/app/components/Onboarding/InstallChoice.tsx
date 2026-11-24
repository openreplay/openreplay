import { Segmented } from '@/ui/inputs/toggle-group';
import { Code2, FileCode2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { InstallMethod } from './install';

export type InstallSetup = 'command' | 'manual';

interface Props {
  method: InstallMethod;
  setup: InstallSetup;
  onMethod: (m: InstallMethod) => void;
  onSetup: (s: InstallSetup) => void;
}

/** The first question: a script tag or npm; with npm, one command or not. */
function InstallChoice({ method, setup, onMethod, onSetup }: Props) {
  const { t } = useTranslation();
  const doors = [
    {
      value: 'script' as const,
      icon: FileCode2,
      label: t('Script tag'),
      hint: t('Paste one snippet in your page. No code tools needed.'),
    },
    {
      value: 'npm' as const,
      icon: Code2,
      label: t('npm package'),
      hint: t('For apps built with React, Vue, Angular and the like.'),
    },
  ];
  return (
    <div className="m-ic">
      <div
        className="m-ic__doors"
        role="radiogroup"
        aria-label={t('How to install')}
      >
        {doors.map(({ value, icon: Icon, label, hint }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={method === value}
            className={`m-ic__door${method === value ? ' is-on' : ''}`}
            onClick={() => onMethod(value)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>
              <b>{label}</b>
              <small>{hint}</small>
            </span>
          </button>
        ))}
      </div>
      {method === 'npm' && (
        <Segmented<InstallSetup>
          value={setup}
          onChange={onSetup}
          ariaLabel={t('Setup')}
          options={[
            { value: 'command', label: t('One command') },
            { value: 'manual', label: t('Step by step') },
          ]}
        />
      )}
    </div>
  );
}

export default InstallChoice;
