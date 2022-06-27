import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { Button, Modal, Form, Icon, Checkbox, Input } from 'UI';
import { useStore } from 'App/mstore'

interface Props {
    show: boolean;
    // dashboard: any;
    closeHandler?: () => void;
    focusTitle?: boolean;
}
function DashboardEditModal(props: Props) {
    const { show, closeHandler, focusTitle } = props;
    const { dashboardStore } = useStore();
    const dashboard = useObserver(() => dashboardStore.dashboardInstance);

    const onSave = () => {
        dashboardStore.save(dashboard).then(closeHandler);
    }

    React.useEffect(() => {
        const handleEsc = (e) => e.key === 'Escape' && closeHandler?.()
        document.addEventListener("keydown", handleEsc, false);
        return () => {
            document.removeEventListener("keydown", handleEsc, false);
        }
    }, [])

    const write = ({ target: { value, name } }) => dashboard.update({ [ name ]: value })

    return useObserver(() => (
        <Modal open={ show } onClose={closeHandler}>
            <Modal.Header className="flex items-center justify-between">
                <div>{ 'Edit Dashboard' }</div>
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
            <Form onSubmit={onSave}>
                <Form.Field>
                    <label>{'Title:'}</label>
                    <Input
                        className=""
                        name="name"
                        value={ dashboard.name }
                        onChange={write}
                        placeholder="Title"
                        maxLength={100}
                        autoFocus={focusTitle}
                    />
                </Form.Field>

                <Form.Field>
                    <label>{'Description:'}</label>
                    <Input
                        className=""
                        type="textarea"
                        name="description"
                        value={ dashboard.description }
                        onChange={write}
                        placeholder="Description"
                        maxLength={300}
                        autoFocus={!focusTitle}
                    />
                </Form.Field>

                <Form.Field>
                    <div className="flex items-center">
                        <Checkbox
                            name="isPublic"
                            className="font-medium mr-3"
                            type="checkbox"
                            checked={ dashboard.isPublic }
                            onClick={ () => dashboard.update({ 'isPublic': !dashboard.isPublic }) }
                        />
                        <div className="flex items-center cursor-pointer" onClick={ () => dashboard.update({ 'isPublic': !dashboard.isPublic }) }>
                            <Icon name="user-friends" size="16" />
                            <span className="ml-2"> Team can see and edit the dashboard.</span>
                        </div>
                    </div>
                </Form.Field>
            </Form>
            </Modal.Content>
            <Modal.Footer>
                <div className="-mx-2 px-2">
                    <Button
                        variant="primary"
                        onClick={ onSave }
                        className="float-left mr-2"
                    >
                        Save
                    </Button>
                    <Button className="mr-2" onClick={ closeHandler }>{ 'Cancel' }</Button>
                </div>
            </Modal.Footer>
      </Modal>
    ));
}

export default DashboardEditModal;
