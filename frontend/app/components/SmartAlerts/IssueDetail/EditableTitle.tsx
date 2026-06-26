import { EditOutlined } from '@ant-design/icons';
import { Button, Input, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

/* Inline rename — a pencil appears on hover; editing shows a small input with
   Cancel / Save (same interaction as Data Management's EditableField). */
export default function EditableTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(value);
  const ref = React.useRef<any>(null);

  const [prev, setPrev] = React.useState(value);
  if (value !== prev) {
    setPrev(value);
    setName(value);
  }

  React.useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const save = () => {
    const v = name.trim();
    if (v) onSave(v);
    setEditing(false);
  };
  const cancel = () => {
    setName(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={ref}
          size="small"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={save}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel();
          }}
          style={{ width: 320 }}
        />
        <Button size="small" type="text" onClick={cancel}>
          {t('Cancel')}
        </Button>
        <Button size="small" type="primary" onClick={save}>
          {t('Save')}
        </Button>
      </div>
    );
  }
  return (
    <Tooltip mouseEnterDelay={0.4} title={t('Click to edit')}>
      <div
        onClick={() => setEditing(true)}
        className="group flex items-center gap-2 cursor-pointer select-none rounded-lg px-2 -mx-2 py-1 hover:bg-teal/10 transition"
      >
        <span className="text-xl font-semibold color-gray-darkest leading-tight">
          {value}
        </span>
        <span className="text-main opacity-0 group-hover:opacity-100 transition-opacity">
          <EditOutlined />
        </span>
      </div>
    </Tooltip>
  );
}
