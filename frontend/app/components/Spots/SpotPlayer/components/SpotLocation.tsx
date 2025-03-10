import { observer } from 'mobx-react-lite';
import React from 'react';
import { Tooltip } from 'antd';
import { Icon } from 'UI';
import { Link2 } from 'lucide-react';
import spotPlayerStore from '../spotPlayerStore';
import { useTranslation } from 'react-i18next';

function SpotLocation() {
  const { t } = useTranslation();
  const currUrl = spotPlayerStore.getClosestLocation(
    spotPlayerStore.time,
  )?.location;
  const displayUrl =
    currUrl.length > 170 ? `${currUrl.slice(0, 170)}...` : currUrl;
  return (
    <div className="w-full bg-white border-b border-gray-lighter">
      <div className="flex w-fit items-center cursor-pointer color-gray-medium text-sm p-1">
        <Link2 className="mx-2" size={16} />
        <Tooltip title={t('Open in new tab')} placement="bottom">
          <a
            href={currUrl}
            target="_blank"
            className="truncate"
            rel="noreferrer"
          >
            {displayUrl}
          </a>
        </Tooltip>
      </div>
    </div>
  );
}

export default observer(SpotLocation);
