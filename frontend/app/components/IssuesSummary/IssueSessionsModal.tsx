import React from 'react';
import { Select, Input, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import SessionItem from 'Shared/SessionItem';
import {
  sortValues,
  SortDropdown,
  sortOptions,
  sortOptionsMap,
} from 'Shared/SessionsTabOverview/components/SessionSort/SessionSort';
import { getSessions } from './api';
import { Loader } from 'UI';

function IssueSessions({
  issueName,
  labels,
  projectId,
}: {
  issueName: string;
  labels: string[];
  projectId: string;
}) {
  const limit = 10;
  const page = 1;
  const range = React.useMemo(
    () => [Date.now() - 30 * 24 * 60 * 60 * 1000, Date.now()],
    [],
  );
  const [sortBy, setSort] = React.useState(sortValues.timeDesc);
  const [usedLabels, setUsedLabels] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState('');
  const write = ({ target: { value } }: { target: { value: string } }) => {
    setQuery(value);
  };
  const { t } = useTranslation();
  const handleChange = (value: string[]) => {
    setUsedLabels(value);
  };

  const { data = [], isPending } = useQuery({
    queryKey: [
      'smart_alerts/search',
      { issueName, query, usedLabels, sortBy, range },
    ],
    queryFn: async () =>
      getSessions(projectId, {
        issueName,
        query,
        usedLabels,
        sortBy,
        range,
        limit,
        page,
      }),
    staleTime: 30_000,
    retry: (count) => count < 3,
  });

  console.log(
    labels.map((label) => ({
      label,
      value: label,
    })),
  );
  return (
    <div className="flex flex-col gap-2 h-screen overflow-y-auto bg-white">
      <div className="w-full flex items-center gap-4 justify-end pt-4 px-4">
        <Input.Search
          value={query}
          allowClear
          name="sess-search-q"
          className="w-[300px]"
          placeholder={t('Search session')}
          onChange={write}
          onSearch={(value) => setQuery(value)}
        />
        <Select
          mode="multiple"
          allowClear
          style={{ width: 300 }}
          placeholder="Pick issue labels to filter"
          onChange={handleChange}
          options={labels.map((label) => ({
            label,
            value: label,
          }))}
        />
        <SortDropdown
          defaultOption={sortBy}
          current={sortOptionsMap(t)[sortBy]}
          onSort={({ key }) => setSort(key)}
          sortOptions={sortOptions(t)}
        />
      </div>
      {isPending ? (
        <div className="flex items-center justify-center h-[300px]">
          <Loader />
        </div>
      ) : null}
      {data.map((session, index) => (
        <div>
          <SessionItem key={index} session={session.session} />
          <div className="flex items-center flex-wrap px-4 pb-2">
            {session.labels.map((l) => (
              <Tag>{l}</Tag>
            ))}
          </div>
          <div className="text-gray-500 text-sm px-4">
            {session.issue || 'No issue description available'}
          </div>
        </div>
      ))}
    </div>
  );
}

export default IssueSessions;
