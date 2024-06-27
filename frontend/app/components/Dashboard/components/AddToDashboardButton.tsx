import React from 'react';
import {Grid2x2Check} from "lucide-react"
import {Button, Modal} from "antd";
import Select from "Shared/Select/Select";
import {Form} from "UI";
import {useStore} from "App/mstore";

interface Props {
    metricId: string;
}

function AddToDashboardButton({metricId}: Props) {
    const {dashboardStore} = useStore();
    const dashboardOptions = dashboardStore.dashboards.map((i: any) => ({
        key: i.id,
        label: i.name,
        value: i.dashboardId,
    }));
    const [selectedId, setSelectedId] = React.useState(dashboardOptions[0].value);

    const onSave = (close: any) => {
        const dashboard = dashboardStore.getDashboard(selectedId)
        if (dashboard) {
            dashboardStore.addWidgetToDashboard(dashboard, [metricId]).then(close)
        }
    }

    const onClick = () => {
        Modal.confirm({
            title: 'Add to selected dashboard',
            icon: null,
            content: (
                <Form.Field>
                    <Select
                        options={dashboardOptions}
                        defaultValue={dashboardOptions[0].value}
                        onChange={({value}: any) => setSelectedId(value.value)}
                    />
                </Form.Field>
            ),
            cancelText: 'Cancel',
            onOk: onSave,
            okText: 'Add',
            footer: (_, {OkBtn, CancelBtn}) => (
                <>
                    <CancelBtn/>
                    <OkBtn/>
                </>
            ),
        })
    }

    return (
        <Button
            type="default"
            onClick={onClick}
            icon={<Grid2x2Check size={18}/>}
        >
            Add to Dashboard
        </Button>
    );
}

export default AddToDashboardButton;
