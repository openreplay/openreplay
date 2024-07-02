import React, { useEffect } from 'react';
import { Modal } from 'antd';
import SelectCard from './SelectCard';
import CreateCard from 'Components/Dashboard/components/DashboardList/NewDashModal/CreateCard';
import colors from 'tailwindcss/colors';
import { connect } from 'react-redux';

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
                                                               isEnterprise = false
                                                             }) => {
  const [step, setStep] = React.useState<number>(0);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('product-analytics');

  useEffect(() => {
    return () => {
      setStep(0);
    };
  }, [open]);

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        width={900}
        destroyOnClose={true}
        footer={null}
        closeIcon={false}
        styles={{
          content: {
            backgroundColor: colors.gray[100]
          }
        }}
        centered={true}
      >
        <div className="flex flex-col gap-4" style={{
          height: 'calc(100vh - 100px)',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {step === 0 && <SelectCard onClose={onClose}
                                     selected={selectedCategory}
                                     setSelectedCategory={setSelectedCategory}
                                     onCard={() => setStep(step + 1)}
                                     isLibrary={isAddingFromLibrary}
                                     isEnterprise={isEnterprise} />}
          {step === 1 && <CreateCard onBack={() => setStep(0)} />}
        </div>
      </Modal>
    </>
  )
    ;
};

const mapStateToProps = (state: any) => ({
  isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee' ||
    state.getIn(['user', 'account', 'edition']) === 'msaas'
});

export default connect(mapStateToProps)(NewDashboardModal);
