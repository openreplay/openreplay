import React from 'react';
import { Input, Button } from 'antd'
import { Pencil } from 'lucide-react'

function UserPropertiesModal({
  properties,
}: {
  properties: Record<string, string>
}) {
  return (
    <div className="p-4 flex flex-col gap-4 h-screen w-full">
      <div className="font-semibold text-xl">All User Properties</div>
      <Input.Search size={'small'} />
      {Object.entries(properties).map(([key, value]) => (
        <Property pkey={key} value={value} />
      ))}
    </div>
  )
}

function Property({ pkey, value, onSave }: {
  pkey: string,
  value: string,
  onSave?: (key: string, value: string) => void
}) {
  const [isEdit, setIsEdit] = React.useState(false)

  return (
    <div className="p-4 flex items-start border-b group w-full hover:bg-gray-lightest">
      <div className={'flex-1'}>{pkey}</div>
      {isEdit ? (
        <div className={'flex-1 flex flex-col gap-2'}>
          <Input size={'small'} defaultValue={value} />
          <div className={'flex items-center gap-2'}>
            <Button type={'text'} onClick={() => setIsEdit(false)}>Cancel</Button>
            <Button type={'primary'}>Save</Button>
          </div>
        </div>
      ) : (
        <div className={'flex-1 text-disabled-text flex justify-between items-start'}>
          <span>{value}</span>
          <div className={'hidden group-hover:block cursor-pointer active:text-blue ml-auto'} onClick={() => setIsEdit(true)}>
            <Pencil size={16} />
          </div>
        </div>
      )}
    </div>
  )
}

export default UserPropertiesModal;