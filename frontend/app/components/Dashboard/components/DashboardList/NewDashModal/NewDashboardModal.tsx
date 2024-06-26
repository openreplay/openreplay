import React, {useEffect} from 'react';
import {Modal} from 'antd';
import SelectCard from './SelectCard';
import CreateCard from "Components/Dashboard/components/DashboardList/NewDashModal/CreateCard";

interface NewDashboardModalProps {
    onClose: () => void;
    open: boolean;
    isAddingFromLibrary?: boolean;
}

const NewDashboardModal: React.FC<NewDashboardModalProps> = ({
                                                                 onClose,
                                                                 open,
                                                                 isAddingFromLibrary = false,
                                                             }) => {
    const [step, setStep] = React.useState<number>(0);
    const [selectedCategory, setSelectedCategory] = React.useState<string>('product-analytics');

    useEffect(() => {
        return () => {
            setStep(0);
        }
    }, [open]);

    return (
        <>
            <Modal open={open} onCancel={onClose} width={900} destroyOnClose={true} footer={null} closeIcon={false}>
                <div>
                    <div className="flex flex-col gap-4">
                        {step === 0 && <SelectCard onClose={onClose}
                                                   selected={selectedCategory}
                                                   setSelectedCategory={setSelectedCategory}
                                                   onCard={() => setStep(step + 1)}
                                                   isLibrary={isAddingFromLibrary}/>}
                        {step === 1 && <CreateCard onBack={() => setStep(0)}/>}
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default NewDashboardModal;
