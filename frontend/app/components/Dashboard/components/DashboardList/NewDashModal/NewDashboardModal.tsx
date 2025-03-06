import { Modal } from 'antd';
import React, { useEffect } from 'react';
import colors from 'tailwindcss/colors';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import CreateCard from 'Components/Dashboard/components/DashboardList/NewDashModal/CreateCard';

import SelectCard from './SelectCard';

interface NewDashboardModalProps {
  onClose: () => void;
  open: boolean;
  isAddingFromLibrary?: boolean;
  isEnterprise?: boolean;
}

const NewDashboardModal: React.FC<NewDashboardModalProps> = ({
  onClose,
  open,
  isAddingFromLibrary = false,
}) => {
  const { projectsStore, userStore } = useStore();
  const { isEnterprise } = userStore;
  const { isMobile } = projectsStore;
  const [step, setStep] = React.useState<number>(0);
  const [selectedCategory, setSelectedCategory] =
    React.useState<string>('product-analytics');

  useEffect(
    () => () => {
      setStep(0);
    },
    [open],
  );

  return (
    <Modal
      open={open}
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
      <div
        className="flex flex-col gap-4"
        style={{
          height: 'calc(100vh - 100px)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {step === 0 && (
          <SelectCard
            onClose={onClose}
            selected={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onCard={() => setStep(step + 1)}
            isLibrary={isAddingFromLibrary}
            isMobile={isMobile}
            isEnterprise={isEnterprise}
          />
        )}
        {step === 1 && <CreateCard onBack={() => setStep(0)} />}
      </div>
    </Modal>
  );
};

export default observer(NewDashboardModal);
