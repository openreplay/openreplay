import React from "react";
import {PlusOutlined} from "@ant-design/icons";
import NewDashboardModal from "Components/Dashboard/components/DashboardList/NewDashModal";
import {Button} from "antd";

interface Props {
    disabled?: boolean;
}

function CreateDashboardButton({disabled = false}: Props) {
    const [showModal, setShowModal] = React.useState(true);

    return <>
        <Button
            icon={<PlusOutlined/>}
            type="primary"
            onClick={() => setShowModal(true)}
        >
            Create Dashboard
        </Button>
        <NewDashboardModal onClose={() => setShowModal(false)} open={showModal}/>
    </>;
}

export default CreateDashboardButton;
