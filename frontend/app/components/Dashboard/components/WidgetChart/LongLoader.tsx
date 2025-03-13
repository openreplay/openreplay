import React from 'react';
import { Progress, Button } from 'antd';
import { Icon } from 'UI';
import { useTranslation } from 'react-i18next';

function LongLoader({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col gap-2 items-center justify-center"
      style={{ height: 240 }}
    >
      <div className="font-semibold flex gap-2 items-center">
        <Icon name="info-circle" size={16} />
        <div>{t('Processing data...')}</div>
      </div>
      <div style={{ width: 180 }}>
        <Progress
          percent={40}
          strokeColor={{
            '0%': '#394EFF',
            '100%': '#394EFF',
          }}
          status="active"
          showInfo={false}
        />
      </div>
      <div>{t('This is taking longer than expected.')}</div>
      {/*<div>*/}
      {/*  {t('Use sample data to speed up query and get a faster response.')}*/}
      {/*</div>*/}
      {/*<div>*/}
      {/*  Use sample data to speed up query and get a faster response.*/}
      {/*</div>*/}
      {/*<Button onClick={onClick}>*/}
      {/*  Use Sample Data*/}
      {/*</Button>*/}
    </div>
  );
}

export default LongLoader;
