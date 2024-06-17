import React, {useEffect} from 'react';
import {Modal} from 'antd';
import SelectCard from './SelectCard';
import CreateCard from "Components/Dashboard/components/DashboardList/NewDashModal/CreateCard";
import {useStore} from "App/mstore";
import {TIMESERIES} from "App/constants/card";

interface NewDashboardModalProps {
    onClose: () => void;
    open: boolean;
}

const NewDashboardModal: React.FC<NewDashboardModalProps> = ({onClose, open}) => {
    const [step, setStep] = React.useState<number>(0);
    const [selectedCard, setSelectedCard] = React.useState<string>('trend-single');
    const {metricStore} = useStore();

    const onCard = (card: any) => {
        setStep(step + 1);
        // setSelectedCard(card);
        // console.log('Selected card:', card)
        console.log('Selected card:', card)
        metricStore.merge({
            name: card.title,
        });
        metricStore.changeType(card.cardType);
    };

    const [modalOpen, setModalOpen] = React.useState<boolean>(false);

    useEffect(() => {
        return () => {
            setStep(1);
        }
    }, [open]);

    return (
        <>
            <Modal open={open} onCancel={onClose} width={900} destroyOnClose={true} footer={null} closeIcon={false}>
                <div>
                    <div className="flex flex-col gap-4">
                        {step === 0 && <SelectCard onClose={onClose} onCard={onCard}/>}
                        {step === 1 && <CreateCard onBack={() => setStep(0)}/>}
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default NewDashboardModal;
