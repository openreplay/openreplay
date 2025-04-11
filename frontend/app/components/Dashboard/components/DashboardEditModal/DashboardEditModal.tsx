import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { Modal, Form, Icon, Checkbox, Input } from 'UI';
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

interface Props {
  show: boolean;
  // dashboard: any;
  closeHandler?: () => void;
  focusTitle?: boolean;
}
function DashboardEditModal(props: Props) {
  const { t } = useTranslation();
  const { show, closeHandler, focusTitle } = props;
  const { dashboardStore } = useStore();
  const dashboard = useObserver(() => dashboardStore.dashboardInstance);

  const onSave = () => {
    dashboardStore.save(dashboard).then(closeHandler);
  };

  React.useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && closeHandler?.();
    document.addEventListener('keydown', handleEsc, false);
    return () => {
      document.removeEventListener('keydown', handleEsc, false);
    };
  }, []);

  const write = ({ target: { value, name } }) =>
    dashboard.update({ [name]: value });

  return useObserver(() => (
    <Modal open={show} onClose={closeHandler}>
      <Modal.Header className="flex items-center justify-between">
        <div>{t('Edit Dashboard')}</div>
        <Button
          type="text"
          name="close"
          onClick={closeHandler}
          icon={<CloseOutlined />}
        />
      </Modal.Header>

      <Modal.Content>
        <Form onSubmit={onSave}>
          <Form.Field>
            <label>{t('Title:')}</label>
            <Input
              className=""
              name="name"
              value={dashboard.name}
              onChange={write}
              placeholder="Title"
              maxLength={40}
              autoFocus={focusTitle}
            />
          </Form.Field>

          {/* <Form.Field>
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
                </Form.Field> */}

          <Form.Field>
            <div className="flex items-center">
              <Checkbox
                name="isPublic"
                className="font-medium mr-3"
                type="checkbox"
                checked={dashboard.isPublic}
                onClick={() =>
                  dashboard.update({ isPublic: !dashboard.isPublic })
                }
              />
              <div
                className="flex items-center cursor-pointer"
                onClick={() =>
                  dashboard.update({ isPublic: !dashboard.isPublic })
                }
              >
                <Icon name="user-friends" size="16" />
                <span className="ml-2">
                  {' '}
                  {t('Team can see and edit the dashboard.')}
                </span>
              </div>
            </div>
          </Form.Field>
        </Form>
      </Modal.Content>
      <Modal.Footer>
        <div className="-mx-2 px-2">
          <Button type="primary" onClick={onSave} className="float-left mr-2">
            {t('Save')}
          </Button>
          <Button type="default" onClick={closeHandler}>
            {t('Cancel')}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  ));
}

export default DashboardEditModal;
