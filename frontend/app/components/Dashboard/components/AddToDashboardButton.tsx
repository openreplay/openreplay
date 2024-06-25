import React from 'react';
import DashboardSelectionModal from "Components/Dashboard/components/DashboardSelectionModal/DashboardSelectionModal";
import {Grid2x2Check} from "lucide-react"
import {Button} from "antd";

interface Props {
    metricId: string;
}

function AddToDashboardButton({metricId}: Props) {
    const [show, setShow] = React.useState(false);
    return (
        <>
            <Button
                type="default"
                // className="ml-2 p-0"
                onClick={() => setShow(true)}
                icon={<Grid2x2Check size={18}/>}
            >
                Add to Dashboard
            </Button>
            {show && (
                <DashboardSelectionModal
                    metricId={metricId}
                    show={show}
                    closeHandler={() => setShow(false)}
                />
            )}
        </>
    );
}

export default AddToDashboardButton;
