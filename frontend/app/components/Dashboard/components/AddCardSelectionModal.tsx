import React from 'react';
import {Card, Col, Modal, Row, Typography} from "antd";
import {GalleryVertical, Plus} from "lucide-react";
import NewDashboardModal from "Components/Dashboard/components/DashboardList/NewDashModal";
import {useStore} from "App/mstore";

interface Props {
    open: boolean;
    onClose?: () => void;
}

function AddCardSelectionModal(props: Props) {
    const {metricStore} = useStore();
    const [open, setOpen] = React.useState(false);
    const [isLibrary, setIsLibrary] = React.useState(false);

    const onCloseModal = () => {
        setOpen(false);
        props.onClose && props.onClose();
    }

    const onClick = (isLibrary: boolean) => {
        if (!isLibrary) {
            metricStore.init();
        }
        setIsLibrary(isLibrary);
        setOpen(true);
    }
    return (
        <>
            <Modal
                title="Add card to dashboard"
                open={props.open}
                footer={null}
                onCancel={props.onClose}
                className='addCard'
            >
                <Row gutter={16} justify="center">
                    <Col span={12}>
                        <div className="flex flex-col items-center justify-center hover:bg-indigo-50 border rounded-lg shadow-sm cursor-pointer gap-3" style={{height: '80px'}} onClick={() => onClick(true)}>
                            <GalleryVertical style={{fontSize: '24px', color: '#394EFF'}}/>
                            <Typography.Text strong>Add from library</Typography.Text>
                            {/*<p>Select from 12 available</p>*/}
                        </div>
                        
                    </Col>
                    <Col span={12}>
                        <div className="flex flex-col items-center justify-center hover:bg-indigo-50 border rounded-lg shadow-sm cursor-pointer gap-3" style={{height: '80px'}} onClick={() => onClick(false)}>
                            <Plus style={{fontSize: '24px', color: '#394EFF'}}/>
                            <Typography.Text strong>Create New Card</Typography.Text>
                        </div>
                    </Col>
                </Row>
            </Modal>
            <NewDashboardModal open={open} onClose={onCloseModal} isAddingFromLibrary={isLibrary}/>
        </>
    );
}

export default AddCardSelectionModal;
