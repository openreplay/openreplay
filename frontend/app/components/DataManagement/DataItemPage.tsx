import React from 'react';
import { Button, Input } from 'antd';
import Breadcrumb from 'Shared/Breadcrumb';
import cn from 'classnames';
import { EditOutlined } from '@ant-design/icons';
import type { CommonProp, CommonEntry } from './Properties/commonProp';
import { FieldNames } from './Properties/commonProp';
import { TextEllipsis } from 'UI';
import { useTranslation } from 'react-i18next';

type BaseProps = {
  footer?: React.ReactNode;
  backLink: { name: string; to: string };
  onSave: (property: { key: string; value: string }) => Promise<void>;
};

type Props =
  | (BaseProps & { type: 'distinct_event'; item: CommonEntry })
  | (BaseProps & { type: 'user' | 'event'; item: CommonProp });

function DataItemPage({ footer, item, backLink, type, onSave }: Props) {
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
      <div className={'rounded-lg border bg-white flex flex-col'}>
        <div
          className={'p-4 border-b w-full flex items-center justify-between'}
        >
          <div
            className={'bg-gray-lighter rounded-xl px-2 font-semibold text-lg'}
          >
            {item.name}
          </div>
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
  const formatter = new Intl.NumberFormat(navigator.language || 'en-US');

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
        'flex border-b last:border-b-0 items-center px-4 py-2 gap-2',
        isEdit ? 'bg-active-blue' : 'hover:bg-active-blue',
      )}
    >
      <div className={'font-semibold'} style={{ flex: 1 }}>
        {fieldName}
      </div>
      <div style={{ flex: 6 }}>
        {isEdit ? (
          <div className={'flex items-center gap-2'}>
            <Input.TextArea
              size={'small'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
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
