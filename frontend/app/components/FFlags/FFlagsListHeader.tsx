import React from 'react';
import { PageTitle } from 'UI';
import { Button } from 'antd';
import FFlagsSearch from 'Components/FFlags/FFlagsSearch';
import { useHistory } from 'react-router';
import { newFFlag, withSiteId } from 'App/routes';
import { useTranslation } from 'react-i18next';

function FFlagsListHeader({ siteId }: { siteId: string }) {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <div className="flex items-center justify-between px-6">
      <div className="flex items-center mr-3 gap-2">
        <PageTitle title={t('Feature Flags')} />
      </div>
      <div className="ml-auto flex items-center">
        <Button
          type="primary"
          onClick={() => history.push(withSiteId(newFFlag(), siteId))}
        >
          {t('Create Feature Flag')}
        </Button>
        <div className="mx-2" />
        <div className="w-1/4" style={{ minWidth: 300 }}>
          <FFlagsSearch />
        </div>
      </div>
    </div>
  );
}

export default FFlagsListHeader;
