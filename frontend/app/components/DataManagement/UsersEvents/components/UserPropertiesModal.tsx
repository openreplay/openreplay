import React from 'react';
import { Input, Button } from 'antd';
import { Pencil } from 'lucide-react';

function UserPropertiesModal({
  properties,
  onSave,
}: {
  properties: Record<string, string>;
  onSave: (key: string, value: string | number) => void;
}) {
  return (
    <div className="p-4 flex flex-col gap-4 h-screen w-full">
      <div className="font-semibold text-xl">All User Properties</div>
      <Input.Search size={'small'} />
      {Object.entries(properties).map(([key, value]) => (
        <Property pkey={key} value={value} onSave={onSave} />
      ))}
    </div>
  );
}

function Property({
  pkey,
  value,
  onSave,
}: {
  pkey: string;
  value: string | number;
  onSave?: (key: string, value: string | number) => void;
}) {
  const [strValue, setValue] = React.useState(value);
  const [isEdit, setIsEdit] = React.useState(false);

  const onSaveClick = () => {
    if (onSave) {
      const wasNumber = !isNaN(Number(value));
      // @ts-ignore
      onSave(pkey, wasNumber ? parseFloat(strValue) : strValue);
    }
    setIsEdit(false);
  };

  const onCancel = () => {
    setValue(value);
    setIsEdit(false);
  };
  return (
    <div className="p-4 flex items-start border-b group w-full hover:bg-gray-lightest">
      <div className={'flex-1'}>{pkey}</div>
      {isEdit ? (
        <div className={'flex-1 flex flex-col gap-2'}>
          <Input
            size={'small'}
            value={strValue}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className={'flex items-center gap-2'}>
            <Button type={'text'} onClick={onCancel}>
              Cancel
            </Button>
            <Button type={'primary'} onClick={onSaveClick}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={
            'flex-1 text-disabled-text flex justify-between items-start'
          }
        >
          <span>{strValue}</span>
          <div
            className={
              'hidden group-hover:block cursor-pointer active:text-blue ml-auto'
            }
            onClick={() => setIsEdit(true)}
          >
            <Pencil size={16} />
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPropertiesModal;
