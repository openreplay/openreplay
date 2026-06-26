import { PlayCircleOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { countries } from 'App/constants';
import { browserIcon, deviceTypeIcon, osIcon } from 'App/iconNames';
import { capitalize } from 'App/utils';
import SessionInfoItem from 'Components/Session_/SessionInfoItem';
import { CountryFlag } from 'UI';

import { type IssueSessionCard, TagChip } from '../shared';

/* A session card titled by its variation of the issue (not user metadata). The
   environment specs sit behind "More" so the card stays clean. No real preview
   image is available outside the player, so the thumbnail is a neutral play
   surface. */
export default function SessionCard({
  s,
  onClick,
}: {
  s: IssueSessionCard;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-xs border transition hover:border-teal">
      <button
        onClick={onClick}
        aria-label={t('Open session replay')}
        className="relative group w-full block cursor-pointer bg-gray-lightest"
        style={{ height: 180 }}
      >
        <div className="absolute inset-0 flex items-center justify-center transition-colors group-hover:bg-teal/10">
          <PlayCircleOutlined
            className="color-gray-medium"
            style={{ fontSize: 44 }}
          />
        </div>
        <div className="absolute bottom-2 right-2 bg-gray-dark text-white py-1 px-2 text-xs rounded-lg">
          {s.dur}
        </div>
      </button>

      <div className="border-t px-3 py-3 flex flex-col gap-2">
        <span className="text-sm font-medium color-gray-darkest leading-snug">
          {s.variation || s.journey || s.email}
        </span>
        {s.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {s.tags.slice(0, 3).map((t) => (
              <TagChip key={t} label={t} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-xs color-gray-medium">
          <span className="whitespace-nowrap">{s.date}</span>
          <Popover
            trigger="hover"
            placement="top"
            content={
              <div className="text-left bg-white" style={{ minWidth: 230 }}>
                <SessionInfoItem
                  comp={<CountryFlag country={s.country} />}
                  label={countries[s.country] || s.country || t('Unknown')}
                  value={s.loc}
                />
                {s.browser && (
                  <SessionInfoItem
                    icon={browserIcon(s.browser)}
                    label={s.browser}
                    value=""
                  />
                )}
                {s.os && (
                  <SessionInfoItem icon={osIcon(s.os)} label={s.os} value="" />
                )}
                <SessionInfoItem
                  icon={deviceTypeIcon(s.device)}
                  label={capitalize(s.device)}
                  value=""
                />
                <SessionInfoItem
                  label={t('Events')}
                  value={String(s.events)}
                  isLast
                />
              </div>
            }
          >
            <span
              className="link cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {t('More')}
            </span>
          </Popover>
        </div>
      </div>
    </div>
  );
}
