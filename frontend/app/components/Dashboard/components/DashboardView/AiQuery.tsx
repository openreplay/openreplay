import { SendOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import Lottie from 'lottie-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import colors from 'tailwindcss/colors';

import { gradientBox } from 'App/components/shared/SessionFilters/AiSessionSearchField';
import aiSpinner from 'App/lottie/aiSpinner.json';
import { useStore } from 'App/mstore';
import { Icon, Input } from 'UI';

import CreateCard from '../DashboardList/NewDashModal/CreateCard';
import { useTranslation } from 'react-i18next';

function AiQuery() {
  const grad = {
    background: 'linear-gradient(90deg, #F3F4FF 0%, #F2FEFF 100%)',
  };
  return (
    <>
      <QueryModal />
      <div className="rounded p-4 mb-4" style={grad}>
        <InputBox />
      </div>
    </>
  );
}

const InputBox = observer(({ inModal }: { inModal?: boolean }) => {
  const { t } = useTranslation();
  const { aiFiltersStore, metricStore } = useStore();
  const metric = metricStore.instance;
  const fetchResults = () => {
    aiFiltersStore
      .getCardFilters(aiFiltersStore.query, undefined)
      .then((f) => metric.createSeries(f.filters));
    if (!inModal) {
      aiFiltersStore.setModalOpen(true);
    }
  };
  return (
    <>
      {!inModal ? (
        <div className="flex items-center mb-2 gap-2">
          <Icon name="sparkles" size={16} />
          <div className="font-medium">
            {t('What would you like to visualize?')}
          </div>
        </div>
      ) : null}
      <div style={gradientBox}>
        <Input
          wrapperClassName="w-full pr-2"
          value={aiFiltersStore.query}
          style={{
            minWidth: inModal ? '600px' : '840px',
            height: 34,
            borderRadius: 32,
          }}
          onChange={({ target }: any) => aiFiltersStore.setQuery(target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && aiFiltersStore.query.trim().length > 2) {
              fetchResults();
            }
          }}
          placeholder={t('E.g., Track all the errors in checkout flow.')}
          className="ml-2 px-2 pe-9 text-lg placeholder-lg !border-0 rounded-e-full nofocus"
          leadingButton={
            aiFiltersStore.query !== '' ? (
              <div
                className="h-full flex items-center cursor-pointer"
                onClick={fetchResults}
              >
                <div className="px-2 py-1 hover:bg-active-blue rounded mr-2">
                  <SendOutlined />
                </div>
              </div>
            ) : null
          }
        />
      </div>
    </>
  );
});

const QueryModal = observer(() => {
  const { aiFiltersStore } = useStore();

  const onClose = () => {
    aiFiltersStore.setModalOpen(false);
  };
  return (
    <Modal
      open={aiFiltersStore.modalOpen}
      onCancel={onClose}
      width={900}
      destroyOnClose
      footer={null}
      closeIcon={false}
      styles={{
        content: {
          backgroundColor: colors.gray[100],
        },
      }}
      centered
    >
      <div className="flex flex-col gap-2">
        {aiFiltersStore.isLoading ? (
          <Loader />
        ) : (
          <CreateCard extra={<InputBox inModal />} onAdded={onClose} />
        )}
      </div>
    </Modal>
  );
});

function Loader() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center flex-col font-medium text-xl min-h-80">
      <div style={{ width: 150, height: 150 }}>
        <Lottie animationData={aiSpinner} loop />
      </div>
      <div>{t('AI is brewing your card, wait a few seconds...')}</div>
    </div>
  );
}

export default observer(AiQuery);
