import {useHistory} from "react-router";
import {useStore} from "App/mstore";
import {useObserver} from "mobx-react-lite";
import {Button, Dropdown, MenuProps, message, Modal} from "antd";
import {BellIcon, EllipsisVertical, TrashIcon} from "lucide-react";
import {toast} from "react-toastify";
import React from "react";
import {useModal} from "Components/ModalContext";
import AlertFormModal from "Components/Alerts/AlertFormModal/AlertFormModal";

const CardViewMenu = () => {
    const history = useHistory();
    const {alertsStore, dashboardStore, metricStore} = useStore();
    const widget = useObserver(() => metricStore.instance);
    const {openModal, closeModal} = useModal();

    const showAlertModal = () => {
        const seriesId = widget.series[0] && widget.series[0].seriesId || '';
        alertsStore.init({query: {left: seriesId}})
        openModal(<AlertFormModal
            onClose={closeModal}
        />, {
            // title: 'Set Alerts',
            placement: 'right',
            width: 620,
        });
    }

    const items: MenuProps['items'] = [
        {
            key: 'alert',
            label: "Set Alerts",
            icon: <BellIcon size={16}/>,
            disabled: !widget.exists() || widget.metricType === 'predefined',
            onClick: showAlertModal,
        },
        {
            key: 'remove',
            label: 'Delete',
            icon: <TrashIcon size={16}/>,
            onClick: () => {
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
            <Dropdown menu={{items}}>
                <Button icon={<EllipsisVertical size={16}/>}/>
            </Dropdown>
        </div>
    );
};

export default CardViewMenu;
