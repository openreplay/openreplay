import React from 'react';
import {Card, Col, Modal, Row, Typography} from "antd";
import {Grid2X2, Plus} from "lucide-react";
import NewDashboardModal from "Components/Dashboard/components/DashboardList/NewDashModal";

interface Props {
    open: boolean;
    onClose?: () => void;
}

function AddCardSelectionModal(props: Props) {
    const [open, setOpen] = React.useState(false);
    const [isLibrary, setIsLibrary] = React.useState(false);

    const onCloseModal = () => {
        setOpen(false);
        // props.onClose && props.onClose();
    }

    const onClick = (isLibrary: boolean) => {
        setIsLibrary(isLibrary);
        setOpen(true);
    }
    return (
        <Modal
            title="Add card to dashboard"
            open={props.open}
            footer={null}
            onCancel={props.onClose}
        >
            <Row gutter={16} justify="center">
                <Col span={12}>
                    <Card hoverable onClick={() => onClick(true)}>
                        <div className="flex flex-col items-center justify-center">
                            <Grid2X2 style={{fontSize: '24px', color: '#1890ff'}}/>
                            <Typography.Text strong>Add from library</Typography.Text>
                            <p>Select from 12 available</p>
                        </div>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card hoverable onClick={() => onClick(false)}>
                        <div className="flex flex-col items-center justify-center">
                            <Plus style={{fontSize: '24px', color: '#1890ff'}}/>
                            <p>Create New Card</p>
                        </div>
                    </Card>
                </Col>
            </Row>

            {open && <NewDashboardModal open={true} onClose={onCloseModal} isAddingFromLibrary={isLibrary}/>}
        </Modal>
    );
}

export default AddCardSelectionModal;
