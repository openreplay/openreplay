import React from 'react';
import { Button, Dropdown, Popover, Switch, Tooltip } from 'antd';
import {
  ChevronDown,
  EllipsisVertical,
  Focus as FocusIcon,
  Info,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import type { Focus } from 'App/mstore/issuesStore';
import FocusDrawer from './FocusDrawer';

/* The Focus entry point: a header button that wears the blue active-tag look
   while anything is focused, opening a compact popover — Yours / Team sections,
   a switch per focus (anyone can toggle: it's the project's shared analysis
   budget), edit/delete on your own, + New focus. */

function FocusRow({
  focus,
  onEdit,
}: {
  focus: Focus;
  onEdit: (f: Focus) => void;
}) {
  const { issuesStore } = useStore();
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 group">
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate" style={{ color: 'var(--color-gray-darkest)' }}>
          {focus.name}
        </span>
        <Tooltip title={focus.summary} placement="left">
          <span className="text-xs truncate cursor-default" style={{ color: 'var(--color-gray-medium)' }}>
            ~{focus.trafficPct}% · ~{focus.sessionsPerDay.toLocaleString()} sessions/day
            {!focus.mine && ` · by ${focus.createdBy}`}
          </span>
        </Tooltip>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {focus.mine && (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'edit', icon: <Pencil size={14} />, label: 'Edit' },
                { type: 'divider' as const },
                {
                  key: 'delete',
                  icon: <Trash2 size={14} />,
                  label: 'Delete',
                  danger: true,
                },
              ],
              onClick: ({ key }) => {
                if (key === 'edit') onEdit(focus);
                else if (key === 'delete') issuesStore.deleteFocus(focus.id);
              },
            }}
          >
            <Button
              type="text"
              size="small"
              aria-label="Focus actions"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              icon={<EllipsisVertical size={14} />}
            />
          </Dropdown>
        )}
        <Switch
          size="small"
          checked={focus.active}
          aria-label={`${focus.name} — ${focus.active ? 'on' : 'off'}`}
          onChange={(on) => issuesStore.toggleFocus(focus.id, on)}
        />
      </div>
    </div>
  );
}

function FocusButton() {
  const { issuesStore } = useStore();
  const [open, setOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Focus | null>(null);

  const mine = issuesStore.focuses.filter((f) => f.mine);
  const team = issuesStore.focuses.filter((f) => !f.mine);
  const activeCount = issuesStore.activeFocusCount;

  const startCreate = () => {
    setEditing(null);
    setOpen(false);
    setDrawerOpen(true);
  };
  const startEdit = (f: Focus) => {
    setEditing(f);
    setOpen(false);
    setDrawerOpen(true);
  };

  const sectionTitle = (label: string) => (
    <div
      className="text-xs font-medium uppercase tracking-wide mt-1"
      style={{ color: 'var(--color-gray-medium)' }}
    >
      {label}
    </div>
  );

  const content = (
    <div className="flex flex-col" style={{ width: 300 }}>
      <div className="flex items-center gap-1.5 pb-1">
        <span className="text-sm font-semibold" style={{ color: 'var(--color-gray-darkest)' }}>
          Focus
        </span>
        <Tooltip
          placement="bottom"
          title="Point the agent's analysis at portions of your traffic. Full traffic keeps a baseline share of the daily sample; active focuses get concentrated sampling on top. Anyone can switch a focus on or off."
        >
          <span className="flex items-center cursor-help" style={{ color: 'var(--color-gray-medium)' }}>
            <Info size={13} />
          </span>
        </Tooltip>
      </div>

      {issuesStore.focuses.length === 0 ? (
        <div className="text-sm py-2" style={{ color: 'var(--color-gray-medium)' }}>
          No focuses yet — the agent samples all traffic. Create one to concentrate
          its analysis on the part you care about.
        </div>
      ) : (
        <>
          {mine.length > 0 && sectionTitle('Yours')}
          {mine.map((f) => (
            <FocusRow key={f.id} focus={f} onEdit={startEdit} />
          ))}
          {team.length > 0 && sectionTitle('Team')}
          {team.map((f) => (
            <FocusRow key={f.id} focus={f} onEdit={startEdit} />
          ))}
        </>
      )}

      <div className="border-t mt-2 pt-2 -mx-1 px-1">
        <Button
          type="text"
          size="small"
          icon={<Plus size={14} />}
          onClick={startCreate}
          className="w-full justify-start!"
        >
          New focus
        </Button>
      </div>
    </div>
  );

  const anyActive = activeCount > 0;

  return (
    <>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="bottomRight"
        content={content}
      >
        <Button
          size="small"
          icon={<FocusIcon size={14} />}
          // active = the blue tag treatment, so the state reads from across the room
          style={
            anyActive
              ? {
                  background: 'rgba(57, 78, 255, 0.1)',
                  color: 'var(--color-main)',
                  borderColor: 'transparent',
                }
              : undefined
          }
        >
          Focus{anyActive ? ` · ${activeCount}` : ''}
          <ChevronDown size={13} style={{ marginLeft: 2, opacity: 0.6 }} />
        </Button>
      </Popover>

      <FocusDrawer
        open={drawerOpen}
        focus={editing}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

export default observer(FocusButton);
