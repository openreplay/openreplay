import React from 'react';
import cn from "classnames";
import WidgetName from "Components/Dashboard/components/WidgetName";
import {useStore} from "App/mstore";
import {useObserver} from "mobx-react-lite";
import AddToDashboardButton from "Components/Dashboard/components/AddToDashboardButton";
import WidgetDateRange from "Components/Dashboard/components/WidgetDateRange/WidgetDateRange";
import {Button, Dropdown, MenuProps, Space, message, Modal} from "antd";
import {BellIcon, EllipsisVertical, TrashIcon} from "lucide-react";
import {useHistory} from "react-router";
import {toast} from "react-toastify";

interface Props {
    onClick?: () => void;
    onSave: () => void;
    undoChanges?: () => void;
}

function WidgetViewHeader({onClick, onSave, undoChanges}: Props) {
    const {metricStore, dashboardStore} = useStore();
    const widget = useObserver(() => metricStore.instance);

    return (
        <div
            className={cn('flex justify-between items-center')}
            onClick={onClick}
        >
            <h1 className="mb-0 text-2xl mr-4 min-w-fit">
                <WidgetName name={widget.name}
                            onUpdate={(name) => metricStore.merge({name})}
                            canEdit={true}/>
            </h1>
            <Space>
                <WidgetDateRange label=""/>
                <AddToDashboardButton metricId={widget.metricId}/>
                <Button
                    type="primary"
                    onClick={onSave}
                    loading={metricStore.isSaving}
                    disabled={metricStore.isSaving || !widget.hasChanged}
                >
                    Update
                </Button>
                <CardViewMenu/>
            </Space>
        </div>
    );
}

export default WidgetViewHeader;

const CardViewMenu = () => {
    const history = useHistory();
    const {dashboardStore, metricStore} = useStore();
    const widget = useObserver(() => metricStore.instance);
    const items: MenuProps['items'] = [
        {
            key: 'alert',
            label: "Set Alerts",
            icon: <BellIcon size={16}/>,
        },
        {
            key: 'remove',
            danger: true,
            label: 'Remove',
            icon: <TrashIcon size={16}/>,
        },
    ];

    const onClick: MenuProps['onClick'] = ({key}) => {
        if (key === 'alert') {
            message.info('Set Alerts');
        } else if (key === 'remove') {
            Modal.confirm({
                title: 'Are you sure you want to remove this card?',
                icon: null,
                // content: 'Bla bla ...',
                footer: (_, {OkBtn, CancelBtn}) => (
                    <>
                        <CancelBtn/>
                        <OkBtn/>
                    </>
                ),
                onOk: () => {
                    metricStore.delete(widget).then(r => {
                        history.goBack();
                    }).catch(() => {
                        toast.error('Failed to remove card');
                    });
                },
            })
        }
    };

    return (
        <div className="flex items-center justify-between">
            <Dropdown menu={{items, onClick}}>
                <Button icon={<EllipsisVertical size={16}/>}/>
            </Dropdown>
        </div>
    );
};
