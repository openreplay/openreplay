import { ArrowRightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

function InitORCard({ onOpenModal }: { onOpenModal: () => void }) {
  const { t } = useTranslation();

  return (
    <div
      className="shadow-sm flex flex-col gap-4 bg-white items-center p-4 mx-auto rounded"
      style={{ width: 236 }}
    >
      <img src="/assets/img/init-or.png" width={200} height={120} />
      <div className="font-semibold">
        {t('Discover the full potential of OpenReplay!')}
      </div>
      <div>
        {t(
          'Empower your product team with essential tools like Session Replay, Product Analytics, Co-Browsing, and more.',
        )}
      </div>
      <Button
        type="primary"
        ghost
        icon={<ArrowRightOutlined />}
        iconPosition="end"
        onClick={onOpenModal}
      >
        {t('Setup OpenReplay Tracker')}
      </Button>
    </div>
  );
}

export default InitORCard;
