import React from 'react';
import Period from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

function SessionDateRange() {
  const { t } = useTranslation();
  const { searchStore } = useStore();
  const { startDate, endDate, rangeValue } = searchStore.instance;
  const period: any = Period({
    start: startDate,
    end: endDate,
    rangeName: rangeValue,
  });
  const isCustom = period.rangeName === 'CUSTOM_RANGE';
  const onDateChange = (e: any) => {
    const dateValues = e.toJSON();
    searchStore.applyFilter(dateValues);
  };
  return (
    <div className="flex items-center text-start">
      <span className="mr-1">
        {t('No sessions')}&nbsp;
        {isCustom ? t('between') : t('in the')}
      </span>
      <SelectDateRange
        period={period}
        onChange={onDateChange}
        right
        useButtonStyle
      />
    </div>
  );
}

export default observer(SessionDateRange);
