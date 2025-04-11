import { DownOutlined, TableOutlined } from '@ant-design/icons';
import { Button, Dropdown, Space, Typography, Tooltip } from 'antd';
import { durationFromMsFormatted } from 'App/date';
import { Member } from 'App/services/AssistStatsService';
import { getInitials, exportCSVFile } from 'App/utils';
import { TFunction } from 'i18next';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, NoContent } from 'UI';

const items = (t: TFunction) => [
  {
    label: t('Sessions Assisted'),
    key: 'sessionsAssisted',
  },
  {
    label: t('Live Duration'),
    key: 'assistDuration',
  },
  {
    label: t('Call Duration'),
    key: 'callDuration',
  },
  {
    label: t('Remote Duration'),
    key: 'controlDuration',
  },
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
  const [dateRange, setDateRange] = React.useState(items(t)[0].label);
  const updateRange = ({ key }: { key: string }) => {
    const item = items(t).find((item) => item.key === key);
    setDateRange(item?.label || items(t)[0].label);
    onMembersSort(item?.key || items(t)[0].key);
  };

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
    <div className="rounded bg-white border p-2 h-full w-full flex flex-col">
      <div className="flex items-center">
        <Typography.Title style={{ marginBottom: 0 }} level={5}>
          {t('Team Members')}
        </Typography.Title>
        <div className="ml-auto flex items-center gap-2">
          <Dropdown menu={{ items, onClick: updateRange }}>
            <Button size="small">
              <Space>
                <Typography.Text>{dateRange}</Typography.Text>
                <DownOutlined rev={undefined} />
              </Space>
            </Button>
          </Dropdown>
          <Tooltip
            title={
              topMembers.list.length === 0
                ? t('No data at the moment to export.')
                : t('Export CSV')
            }
          >
            <Button
              onClick={onExport}
              shape="default"
              size="small"
              disabled={topMembers.list.length === 0}
              icon={<TableOutlined rev={undefined} />}
            />
          </Tooltip>
        </div>
      </div>
      <Loader
        loading={isLoading}
        style={{ minHeight: 150, height: 300 }}
        size={48}
      >
        <NoContent
          size="small"
          title={
            <div className="text-base font-normal">
              {t('No data available')}
            </div>
          }
          show={topMembers.list && topMembers.list.length === 0}
          style={{ height: '100px' }}
        >
          {topMembers.list.map((member) => (
            <div
              key={member.name}
              className="w-full flex items-center gap-2 border-b pt-2 pb-1"
            >
              <div className="relative flex items-center justify-center w-10 h-10">
                <div className="absolute left-0 right-0 top-0 bottom-0 mx-auto w-10 h-10 rounded-full opacity-30 bg-tealx" />
                <div className="text-lg uppercase color-tealx">
                  {getInitials(member.name)}
                </div>
              </div>
              <div>{member.name}</div>
              <div className="ml-auto">
                {membersSort === 'sessionsAssisted'
                  ? member.count
                  : durationFromMsFormatted(member.count)}
              </div>
            </div>
          ))}
        </NoContent>
      </Loader>
      <div className="flex items-center justify-center text-disabled-text p-2 mt-auto">
        {isLoading || topMembers.list.length === 0
          ? ''
          : `${t('Showing 1 to')} ${topMembers.total} ${t('of the total')}`}
      </div>
    </div>
  );
}

export default TeamMembers;
