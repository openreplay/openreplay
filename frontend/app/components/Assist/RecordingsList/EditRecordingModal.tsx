import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { Button, Modal, Form, Icon, Input } from 'UI';

interface Props {
    show: boolean;
    title: string;
    closeHandler?: () => void;
    onSave: (title: string) => void;
}
function EditRecordingModal(props: Props) {
    const { show, closeHandler, title, onSave } = props;
    const [text, setText] = React.useState(title)

    React.useEffect(() => {
        const handleEsc = (e: any) => e.key === 'Escape' && closeHandler?.()
        document.addEventListener("keydown", handleEsc, false);
        return () => {
            document.removeEventListener("keydown", handleEsc, false);
        }
    }, [])

    const write = ({ target: { value, name } }: any) => setText(value)

    const save = () => {
      onSave(text)
    }
    return useObserver(() => (
        <Modal open={ show } onClose={closeHandler}>
            <Modal.Header className="flex items-center justify-between">
                <div>{ 'Rename' }</div>
                <div onClick={ closeHandler }>
                  <Icon
                    color="gray-dark"
                    size="14"
                    name="close"
                  />
                </div>
            </Modal.Header>

            <Modal.Content>
            <Form onSubmit={save}>
                <Form.Field>
                    <label>{'Title:'}</label>
                    <Input
                        className=""
                        name="name"
                        value={ text }
                        onChange={write}
                        placeholder="Title"
                        maxLength={100}
                        autoFocus
                    />
                </Form.Field>
            </Form>
            </Modal.Content>
            <Modal.Footer>
                <div className="-mx-2 px-2">
                    <Button
                        variant="primary"
                        onClick={ save }
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

export default EditRecordingModal;
