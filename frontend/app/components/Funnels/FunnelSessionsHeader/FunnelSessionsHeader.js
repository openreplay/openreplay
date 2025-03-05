import React from 'react';
import SortDropdown from './SortDropdown';
import { useTranslation } from 'react-i18next';

const sortOptionsMap = {
  'startedAt-desc': 'Newest',
  'startedAt-asc': 'Oldest',
  'eventsCount-asc': 'Events (Low)',
  'eventsCount-desc': 'Events (High)',
};
const sortOptions = Object.entries(sortOptionsMap).map(([value, label]) => ({
  value,
  label,
}));

function FunnelSessionsHeader({ sessionsCount, inDetails = false }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center">
      <div className="flex items-center mr-auto text-xl">
        <div className="font-medium mr-2">{`${sessionsCount} Session${sessionsCount === 1 ? '' : 's'}`}</div>
        <div className="mr-2">
          {inDetails ? 'affected by this issue' : 'went through this funnel'}
        </div>
      </div>

      <div>
        <div className="flex items-center ml-6">
          <span className="mr-2 color-gray-medium">{t('Sort By')}</span>
          <SortDropdown options={sortOptions} />
        </div>
      </div>
    </div>
  );
}

export default FunnelSessionsHeader;
