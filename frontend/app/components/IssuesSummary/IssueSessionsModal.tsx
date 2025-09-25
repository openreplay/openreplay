import React from 'react';
import { Select, Input, Tag, Radio } from 'antd';
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
import Session from 'Types/session/session';
import { debounce } from 'App/utils';

interface IssueSession {
  session: Session;
  journey: string;
  journeyLabels: string[];
  issueDescription: string;
  issueLabels: string[];
  issueTimestamp: number | null;
}

function IssueSessions({
  issueName,
  issueLabels,
  journeyLabels,
  projectId,
  hideModal
}: {
  issueName: string;
  issueLabels: string[];
  journeyLabels: string[];
  projectId: string;
  hideModal: () => void;
}) {
  const limit = 10;
  const page = 1;
  const range = React.useMemo(
    () => [Date.now() - 30 * 24 * 60 * 60 * 1000, Date.now()],
    [],
  );
  const [sortBy, setSort] = React.useState(sortValues.timeDesc);
  const [usedIssueLabels, setUsedIssueLabels] = React.useState<string[]>([]);
  const [usedJourneyLabels, setUsedJourneyLabels] = React.useState<string[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const [query, setQuery] = React.useState('');
  const write = ({ target: { value } }: { target: { value: string } }) => {
    setQuery(value);
  };
  const { t } = useTranslation();
  const handleChange = (value: string[]) => {
    setUsedIssueLabels(value);
  };
  const handleJourneyTagChange = (value: string[]) => {
    setUsedJourneyLabels(value);
  };

  const debouncedUpdate = React.useCallback(debounce(setSearchQuery, 300), []);

  React.useEffect(() => {
    debouncedUpdate(query);
  }, [query]);

  const { data = [], isPending } = useQuery<IssueSession[]>({
    queryKey: [
      'smart_alerts/search',
      {
        issueName,
        searchQuery,
        usedIssueLabels,
        sortBy,
        range,
        usedJourneyLabels,
      },
    ],
    queryFn: async () =>
      getSessions(projectId, {
        issueName,
        searchQuery,
        usedIssueLabels,
        usedJourneyLabels,
        sortBy,
        range,
        limit,
        page,
      }),
    staleTime: 30_000,
    retry: (count) => count < 3,
  });

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
          style={{ width: 200 }}
          placeholder="Filter by issue tags"
          onChange={handleChange}
          options={issueLabels.map((label) => ({
            label,
            value: label,
          }))}
        />
        <Select
          mode="multiple"
          allowClear
          style={{ width: 200 }}
          placeholder="Filter by journey tags"
          onChange={handleJourneyTagChange}
          options={journeyLabels.map((label) => ({
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
      {data.map((issueSession, index) => (
        <SessionWithIssue
          issueSession={issueSession}
          key={index}
          index={index}
          hideModal={hideModal}
        />
      ))}
    </div>
  );
}

function SessionWithIssue({
  issueSession,
  index,
  hideModal
}: {
  issueSession: IssueSession;
  index: number;
  hideModal: () => void;
}) {
  const [displayType, setDisplayType] = React.useState<'issue' | 'journey'>(
    'issue',
  );

  if (!issueSession) return null;

  const labels =
    displayType === 'issue'
      ? issueSession.issueLabels
      : issueSession.journeyLabels;
  const description =
    displayType === 'issue'
      ? issueSession.issueDescription
      : issueSession.journey;
  return (
    <div>
      <SessionItem
        key={index}
        session={issueSession.session}
        query={
          issueSession.issueTimestamp
            ? `?jumpto=${issueSession.issueTimestamp}`
            : undefined
        }
        onBeforeOpen={hideModal}
      />
      <div className="rounded-lg px-4 py-2 border border-gray-light flex flex-col gap-2 mx-4">
        <Radio.Group
          size="small"
          value={displayType}
          onChange={(ev) => setDisplayType(ev.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="issue">Issue</Radio.Button>
          <Radio.Button value="journey">Journey</Radio.Button>
        </Radio.Group>
        <div className="flex items-center flex-wrap gap-2">
          {labels.map((l) => (
            <Tag className="!m-0">{l}</Tag>
          ))}
        </div>
        <div className="text-gray-500 text-sm">
          {description ? description : 'No description available'}
        </div>
      </div>
    </div>
  );
}

export default IssueSessions;
