import React from 'react';
import { Button, Input, Switch } from 'antd';
import Breadcrumb from 'Shared/Breadcrumb';
import cn from 'classnames';
import { EditOutlined } from '@ant-design/icons';
import type { CommonProp, CommonEntry } from './Properties/commonProp';
import { FieldNames } from './Properties/commonProp';
import { TextEllipsis } from 'UI';
import { useTranslation } from 'react-i18next';
import { Triangle } from 'Components/DataManagement/Activity/EventDetailsModal';

type BaseProps = {
  footer?: React.ReactNode;
  backLink: { name: string; to: string };
  onSave: (property: { key: string; value: string }) => Promise<void>;
  openSessions?: () => void;
};

type Props =
  | (BaseProps & { type: 'distinct_event'; item: CommonEntry })
  | (BaseProps & { type: 'user' | 'event'; item: CommonProp });

function DataItemPage({
  footer,
  item,
  backLink,
  type,
  onSave,
  openSessions,
}: Props) {
  const [shownStatus, setShownStatus] = React.useState(
    'status' in item ? item.status === 'visible' : false,
  );
  const { t } = useTranslation();
  const fields = Object.entries(item.fields).map(([key, field]) => ({
    name: FieldNames(key, type),
    raw_name: key,
    value: field.value,
    readonly: field.readonly,
  }));

  const toggleStatus = () => {
    if (!('status' in item)) return;
    setShownStatus((prev) => {
      const newStatus = prev ? 'hidden' : 'visible';
      onSave({ key: 'status', value: newStatus });
      return !prev;
    });
  };
  return (
    <div
      className={'flex flex-col gap-2 mx-auto w-full'}
      style={{ maxWidth: 1360 }}
    >
      <Breadcrumb
        items={[
          { label: backLink.name, to: backLink.to },
          { label: item.name },
        ]}
      />
      <div className={'rounded-lg border bg-white flex flex-col pb-4'}>
        <div
          className={'p-4 border-b w-full flex items-center justify-between'}
        >
          <div
            className={
              'bg-gray-lighter rounded-lg px-2.5 font-semibold text-base font-mono'
            }
          >
            {item.name}
          </div>
          {openSessions && (
            <div
              className={'link flex gap-1 items-center'}
              onClick={openSessions}
            >
              <span>Play Sessions</span>
              <Triangle size={10} color={'blue'} />
            </div>
          )}
        </div>
        {fields.map((field) => (
          <EditableField
            onSave={onSave}
            fieldName={field.name}
            rawName={field.raw_name}
            value={field.value}
            readonly={field.readonly}
          />
        ))}
        {'status' in item && (
          <div className="px-2 mx-2 py-3 hover:bg-active-blue">
            <div className="flex items-center">
              <div className="font-medium flex-1">{t('Status')}</div>
              <div className="flex-6 flex items-center gap-2">
                <Switch
                  checked={shownStatus}
                  onChange={toggleStatus}
                  checkedChildren={t('Visible')}
                  unCheckedChildren={t('Hidden')}
                />
              </div>
            </div>
            <div className="text-sm text-disabled-text mt-2">
              {`This property is ${item.status} in search and analytics.`}
            </div>
          </div>
        )}
      </div>

      {footer}
    </div>
  );
}

function EditableField({
  onSave,
  fieldName,
  value,
  readonly,
  rawName,
}: {
  onSave: (property: { key: string; value: string }) => void;
  fieldName: string;
  value: string;
  readonly?: boolean;
  rawName: string;
}) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = React.useState(value);
  const [isEdit, setIsEdit] = React.useState(false);
  const formatter = new Intl.NumberFormat('en-US');

  const handleSave = () => {
    onSave({ key: rawName, value: inputValue });
    setIsEdit(false);
  };

  const formatNumbers = (text: string) => {
    return text.replace(/\d+/g, (num) => formatter.format(Number(num)));
  };
  return (
    <div
      className={cn(
        'flex border-b last:border-b-0 items-center px-2 mx-2 py-3',
        isEdit ? 'bg-active-blue' : 'hover:bg-active-blue',
      )}
    >
      <div className={'font-medium'} style={{ flex: 1 }}>
        {fieldName}
      </div>
      <div style={{ flex: 6 }}>
        {isEdit ? (
          <div className={'flex items-center gap-2'}>
            {rawName === 'description' ? (
              <Input.TextArea
                size={'small'}
                value={inputValue}
                rows={1}
                onChange={(e) => setInputValue(e.target.value)}
              />
            ) : (
              <Input
                size={'small'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            <div className={'ml-auto'} />
            <Button
              size={'small'}
              type={'text'}
              onClick={() => setIsEdit(false)}
            >
              {t('Cancel')}
            </Button>
            <Button size={'small'} type={'primary'} onClick={handleSave}>
              {t('Save')}
            </Button>
          </div>
        ) : (
          <div className={'flex items-center justify-between'}>
            <TextEllipsis text={formatNumbers(inputValue)} maxWidth={'900px'} />
            {readonly ? null : (
              <div
                className={'cursor-pointer text-main'}
                onClick={() => setIsEdit(true)}
              >
                <EditOutlined size={16} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DataItemPage;
