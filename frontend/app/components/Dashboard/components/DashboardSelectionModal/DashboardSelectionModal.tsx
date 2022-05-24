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

    return useObserver(() => (
        <Modal size="tiny" open={ show }>
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
                <div className="py-4">
                        <Form.Field>
                            <label className="mb-2">{'Dashbaord:'}</label>
                            <Select
                                options={dashboardOptions}
                                defaultValue={dashboardOptions[0].value}
                                onChange={({ value }: any) => setSelectedId(value)}
                            />
                        </Form.Field>
                </div>
            </Modal.Content>
            <Modal.Actions>
                <div className="-mx-2 px-2">
                    <Button
                        primary
                        onClick={ onSave }
                        // loading={ loading }
                    >
                        Add
                    </Button>
                    <Button className="" marginRight onClick={ closeHandler }>{ 'Cancel' }</Button>
                </div>
            </Modal.Actions>
      </Modal>
    ));
}

export default DashboardSelectionModal;