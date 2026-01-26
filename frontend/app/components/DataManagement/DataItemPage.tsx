import React from 'react';
import { Button, Input } from 'antd';
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
  const fields = Object.entries(item.fields).map(([key, field]) => ({
    name: FieldNames(key, type),
    raw_name: key,
    value: field.value,
    readonly: field.readonly,
  }));

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
        'flex border-b last:border-b-0 items-center px-2 mx-2 py-3 gap-2',
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
            <TextEllipsis
              text={formatNumbers(inputValue) || 'N/A'}
              maxWidth={'900px'}
            />
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
