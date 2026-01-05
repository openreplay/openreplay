import React from 'react';
import { Button, Input } from 'antd';
import Breadcrumb from 'Shared/Breadcrumb';
import cn from 'classnames';
import { EditOutlined } from '@ant-design/icons';
import type { CommonProp } from './Properties/commonProp';
import { FieldNames } from './Properties/commonProp';

function DataItemPage({
  footer,
  item,
  backLink,
  type,
}: {
  footer?: React.ReactNode;
  item: CommonProp;
  backLink: { name: string; to: string };
  type: 'user' | 'event';
}) {
  const fields = Object.entries(item.fields).map(([key, field]) => ({
    name: FieldNames(key, type),
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
            onSave={() => null}
            fieldName={field.name}
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
}: {
  onSave: (value: string) => void;
  fieldName: string;
  value: string;
  readonly?: boolean;
}) {
  const [isEdit, setIsEdit] = React.useState(false);
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
            <Input size={'small'} defaultValue={value} />
            <div className={'ml-auto'} />
            <Button
              size={'small'}
              type={'text'}
              onClick={() => setIsEdit(false)}
            >
              Cancel
            </Button>
            <Button size={'small'} type={'primary'}>
              Save
            </Button>
          </div>
        ) : (
          <div className={'flex items-center justify-between'}>
            <span>{value}</span>
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
