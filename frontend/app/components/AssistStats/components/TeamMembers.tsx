import { IconButton } from '@/ui/actions/IconButton';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { SimpleSelect } from '@/ui/inputs/select';
import { TFunction } from 'i18next';
import { Sheet } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { durationFromMsFormatted } from 'App/date';
import { Member } from 'App/services/AssistStatsService';
import { exportCSVFile, getInitials } from 'App/utils';

const items = (t: TFunction) => [
  { label: t('Sessions assisted'), value: 'sessionsAssisted' },
  { label: t('Live duration'), value: 'assistDuration' },
  { label: t('Call duration'), value: 'callDuration' },
  { label: t('Remote duration'), value: 'controlDuration' },
];

function TeamMembers({
  isLoading,
  topMembers,
  onMembersSort,
  membersSort,
}: {
  isLoading: boolean;
  topMembers: { list: Member[]; total: number };
  onMembersSort: (v: string) => void;
  membersSort: string;
}) {
  const { t } = useTranslation();

  const onExport = () => {
    const headers = [
      { label: t('Team Member'), key: 'name' },
      { label: t('Sessions Assisted'), key: 'sessionsAssisted' },
      { label: t('Live Duration'), key: 'assistDuration' },
      { label: t('Call Duration'), key: 'callDuration' },
      { label: t('Remote Duration'), key: 'controlDuration' },
    ];
    const data = topMembers.list.map((member) => ({
      name: `"${member.name}"`,
      sessionsAssisted: `"${member.assistCount}"`,
      assistDuration: `"${durationFromMsFormatted(member.assistDuration)}"`,
      callDuration: `"${durationFromMsFormatted(member.callDuration)}"`,
      controlDuration: `"${durationFromMsFormatted(member.controlDuration)}"`,
    }));
    exportCSVFile(
      headers,
      data,
      `Team_Members_${new Date().toLocaleDateString()}`,
    );
  };

  return (
    <section className="m-astats__card">
      <header className="m-astats__card-head">
        <h3 className="m-astats__card-title">{t('Team members')}</h3>
        <SimpleSelect
          variant="subtle"
          value={membersSort}
          ariaLabel={t('Rank by')}
          onChange={(v) => v && onMembersSort(v)}
          options={items(t)}
        />
        <IconButton
          icon={<Sheet size={14} />}
          label={
            topMembers.list.length === 0
              ? t('No data at the moment to export.')
              : t('Export CSV')
          }
          variant="ghost"
          disabled={topMembers.list.length === 0}
          onClick={onExport}
        />
      </header>
      {isLoading ? (
        <SkeletonRows rows={4} columns={[70, 20]} />
      ) : topMembers.list.length === 0 ? (
        <p className="m-astats__none">{t('No data available')}</p>
      ) : (
        <ul className="m-astats__members">
          {topMembers.list.map((member) => (
            <li key={member.name} className="m-astats__member">
              <span className="m-astats__initials" aria-hidden="true">
                {getInitials(member.name)}
              </span>
              <span className="m-astats__member-name">{member.name}</span>
              <span className="m-astats__member-n">
                {membersSort === 'sessionsAssisted'
                  ? member.count
                  : durationFromMsFormatted(member.count)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default TeamMembers;
