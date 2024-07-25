import { Input, Icon } from 'UI';
import React from 'react';
import { SendOutlined } from '@ant-design/icons';

import { gradientBox } from 'App/components/shared/SessionSearchField/AiSessionSearchField';

function AiQuery() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const grad = {
    background: 'linear-gradient(90deg, #F3F4FF 0%, #F2FEFF 100%)',
  };
  const fetchResults = () => null;

  // const fetchResults = useCallback(() => aiFiltersStore.getCardFilters(aiQuery, metric.metricType)
  //         .then(f => metric.createSeries(f.filters)), [aiFiltersStore, aiQuery, metric]);
  return (
    <div className={'rounded p-4 mb-4'} style={grad}>
      <div className={'flex items-center mb-2 gap-2'}>
        <Icon name={'sparkles'} size={16} />
        <div className={'font-semibold'}>What would you like to visualize?</div>
      </div>
      <div style={gradientBox}>
        <Input
          style={{ minWidth: '840px', height: 34, borderRadius: 32, }}
          onChange={({ target }: any) => setSearchQuery(target.value)}
          placeholder={'E.g., Track all the errors in checkout flow.'}
          className="ml-2 px-2 pe-9 text-lg placeholder-lg !border-0 rounded-e-full nofocus"
          leadingButton={
            searchQuery !== '' ? (
              <div
                className={'h-full flex items-center cursor-pointer'}
                onClick={fetchResults}
              >
                <div className={'px-2 py-1 hover:bg-active-blue rounded mr-2'}>
                  <SendOutlined />
                </div>
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}

export default AiQuery;