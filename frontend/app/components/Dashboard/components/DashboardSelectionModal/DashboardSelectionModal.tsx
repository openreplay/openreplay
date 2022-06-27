import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { Button, Modal, Form, Icon } from 'UI';
import { useStore } from 'App/mstore'
import Select from 'Shared/Select';

interface Props {
    metricId: string,
    show: boolean;
    closeHandler?: () => void;
}
function DashboardSelectionModal(props: Props) {
    const { show, metricId, closeHandler } = props;
    const { dashboardStore } = useStore();
    const dashboardOptions = dashboardStore.dashboards.map((i: any) => ({
        key: i.id,
        label: i.name,
        value: i.dashboardId,
    }));
    const [selectedId, setSelectedId] = React.useState(dashboardOptions[0].value);

    const onSave = () => {
        const dashboard = dashboardStore.getDashboard(selectedId)
        if (dashboard) {
            dashboardStore.addWidgetToDashboard(dashboard, [metricId]).then(closeHandler)
        }
    }

    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                closeHandler();
            }
        }

        document.addEventListener('keydown', handleEsc, false);

        return () => {
            document.removeEventListener('keydown', handleEsc, false);
        }
    }, [])

    return useObserver(() => (
        <Modal size="small" open={ show } onClose={closeHandler}>
            <Modal.Header className="flex items-center justify-between">
                <div>{ 'Add to selected dashboard' }</div>
                <Icon 
                    role="button"
                    tabIndex="-1"
                    color="gray-dark"
                    size="14"
                    name="close"
                    onClick={ closeHandler }
                />
            </Modal.Header>

            <Modal.Content>
                <Form.Field>
                    <label className="mb-2">{'Dashbaord:'}</label>
                    <Select
                        options={dashboardOptions}
                        defaultValue={dashboardOptions[0].value}
                        onChange={({ value }: any) => setSelectedId(value.value)}
                    />
                </Form.Field>
            </Modal.Content>
            <Modal.Footer>
                <Button
                    variant="primary"
                    onClick={ onSave }
                    className="float-left mr-2"
                >
                    Add
                </Button>
                <Button className="mr-2" onClick={ closeHandler }>{ 'Cancel' }</Button>
            </Modal.Footer>
      </Modal>
    ));
}

export default DashboardSelectionModal;
