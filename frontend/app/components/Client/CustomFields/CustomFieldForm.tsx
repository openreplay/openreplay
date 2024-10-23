import React, { useRef, useState } from 'react';
import { Form, Input, confirm } from 'UI';
import styles from './customFieldForm.module.css';
import { useStore } from 'App/mstore';
import { useModal } from 'Components/Modal';
import { toast } from 'react-toastify';
import { Button } from 'antd';
import { Trash } from 'UI/Icons';
import { observer } from 'mobx-react-lite';

interface CustomFieldFormProps {
  siteId: string;
}

const CustomFieldForm: React.FC<CustomFieldFormProps> = ({ siteId }) => {
  const focusElementRef = useRef<HTMLInputElement>(null);
  const { customFieldStore: store } = useStore();
  const field = store.instance;
  const { hideModal } = useModal();
  const [loading, setLoading] = useState(false);

  const write = ({ target: { value, name } }: any) => store.edit({ [name]: value });
  const exists = field?.exists();

  const onDelete = async () => {
    if (
      await confirm({
        header: 'Metadata',
        confirmation: `Are you sure you want to remove?`
      })
    ) {
      store.remove(siteId, field?.index!).then(() => {
        hideModal();
      });
    }
  };

  const onSave = (field: any) => {
    setLoading(true);
    store.save(siteId, field).then((response) => {
      if (!response || !response.errors || response.errors.size === 0) {
        hideModal();
        toast.success('Metadata added successfully!');
      } else {
        toast.error(response.errors[0]);
      }
    }).finally(() => {
      setLoading(false);
    });
  };

  return (
    <div className="bg-white h-screen overflow-y-auto">
      <h3 className="p-5 text-2xl">{exists ? 'Update' : 'Add'} Metadata Field</h3>
      <Form className={styles.wrapper}>
        <Form.Field>
          <label>{'Field Name'}</label>
          <Input
            ref={focusElementRef}
            name="key"
            value={field?.key}
            onChange={write}
            placeholder="Field Name"
            maxLength={50}
          />
        </Form.Field>

        <div className="flex justify-between">
          <div className="flex items-center">
            <Button
              onClick={() => onSave(field)}
              disabled={!field?.validate()}
              loading={loading}
              type="primary"
              className="float-left mr-2"
            >
              {exists ? 'Update' : 'Add'}
            </Button>
            <Button data-hidden={!exists} onClick={hideModal}>
              {'Cancel'}
            </Button>
          </div>

          <Button type="text" icon={<Trash />} data-hidden={!exists} onClick={onDelete}></Button>
        </div>
      </Form>
    </div>
  );
};

export default observer(CustomFieldForm);
