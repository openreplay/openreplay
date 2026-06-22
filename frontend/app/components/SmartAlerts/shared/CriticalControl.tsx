import { Popover, Tag, Tooltip } from 'antd';
import { AlertTriangle, X } from 'lucide-react';
import React from 'react';

import CriticalReasonPanel from './CriticalReasonPanel';

const critContent = (text: string, withClose = false) => (
  <span className="inline-flex items-center gap-1">
    <AlertTriangle size={12} strokeWidth={2} style={{ fill: 'none' }} />
    <span>{text}</span>
    {withClose && <X size={12} style={{ marginLeft: 2, opacity: 0.65 }} />}
  </span>
);

/* The critical flag rendered as an antd Tag (detail page). With `onSet` it's a
   two-way toggle: a removable red tag opening a reason popover, or a faint
   "Mark critical" tag (instant). Without `onSet` it's a static red tag. */
export default function CriticalControl({
  critical,
  onSet,
}: {
  critical: boolean;
  onSet?: (val: boolean, reason?: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  if (!critical) {
    if (!onSet) return null;
    return (
      <Tooltip title="Mark as critical">
        <Tag
          bordered
          onClick={() => onSet(true)}
          className="crit-tag cursor-pointer transition-[filter] hover:brightness-95 m-0 color-gray-medium"
        >
          {critContent('Mark critical')}
        </Tag>
      </Tooltip>
    );
  }

  if (!onSet) {
    return (
      <Tag color="red" bordered className="m-0">
        {critContent('Critical')}
      </Tag>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      content={
        <CriticalReasonPanel
          onCancel={() => setOpen(false)}
          onConfirm={(reason) => {
            onSet(false, reason);
            setOpen(false);
          }}
        />
      }
    >
      <Tag
        color="red"
        bordered
        className="crit-tag cursor-pointer transition-[filter] hover:brightness-95 m-0"
      >
        {critContent('Critical', true)}
      </Tag>
    </Popover>
  );
}
