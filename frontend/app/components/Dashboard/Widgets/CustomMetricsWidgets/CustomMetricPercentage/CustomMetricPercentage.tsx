import React from 'react';
import { numberWithCommas } from 'App/utils';
import { useTranslation } from 'react-i18next';

interface Props {
  data: any;
  params: any;
  colors: any;
  onClick?: (event, index) => void;
}
function CustomMetriPercentage(props: Props) {
  const { t } = useTranslation();
  const { data = {} } = props;
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ height: '240px' }}
    >
      <div className="text-6xl">{numberWithCommas(data.count)}</div>
      <div className="text-lg mt-6">{`${parseInt(data.previousCount || 0)} ( ${Math.floor(parseInt(data.countProgress || 0))}% )`}</div>
      <div className="color-gray-medium">{t('from previous period.')}</div>
    </div>
  );
}

export default CustomMetriPercentage;
