import React, { useRef, useState } from 'react';
import { Form, Input } from 'UI';
import { useStore } from 'App/mstore';
import { useModal } from 'Components/Modal';
import { toast } from 'react-toastify';
import { Button, Modal } from 'antd';
import { Trash } from 'UI/Icons';
import { observer } from 'mobx-react-lite';
import styles from './customFieldForm.module.css';
import { useTranslation } from 'react-i18next';

interface CustomFieldFormProps {
  siteId: string;
}

const CustomFieldForm: React.FC<CustomFieldFormProps> = ({ siteId }) => {
  const { t } = useTranslation();
  const focusElementRef = useRef<HTMLInputElement>(null);
  const { customFieldStore: store } = useStore();
  const field = store.instance;
  const { hideModal } = useModal();
  const [loading, setLoading] = useState(false);

  const write = ({ target: { value, name } }: any) =>
    store.edit({ [name]: value });
  const exists = field?.exists();

  const onDelete = async () => {
    Modal.confirm({
      title: t('Metadata'),
      content: t('Are you sure you want to remove?'),
      onOk: async () => {
        await store.remove(siteId, field?.index!);
        hideModal();
      },
    });
  };

  const onSave = (field: any) => {
    setLoading(true);
    store
      .save(siteId, field)
      .then((response) => {
        if (!response || !response.errors || response.errors.size === 0) {
          hideModal();
          toast.success(t('Metadata added successfully!'));
        } else {
          toast.error(response.errors[0]);
        }
      })
      .catch(() => {
        toast.error(t('An error occurred while saving metadata.'));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="bg-white h-screen overflow-y-auto">
      <h3 className="p-5 text-xl">
        {exists ? t('Update') : 'Add'}&nbsp;{t('Metadata Field')}
      </h3>
      <Form className={styles.wrapper}>
        <Form.Field>
          <label>{t('Field Name')}</label>
          <Input
            ref={focusElementRef}
            name="key"
            value={field?.key}
            onChange={write}
            placeholder={t('E.g. plan')}
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
              {exists ? t('Update') : t('Add')}
            </Button>
            <Button type="text" data-hidden={!exists} onClick={hideModal}>
              {t('Cancel')}
            </Button>
          </div>

          <Button
            type="text"
            icon={<Trash />}
            data-hidden={!exists}
            onClick={onDelete}
          />
        </div>
      </Form>
    </div>
  );
};

export default observer(CustomFieldForm);
