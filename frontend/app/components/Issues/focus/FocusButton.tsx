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
    <div className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg group hover:bg-gray-lightest transition-colors">
      {/* state tile — blue while the agent is watching this slice, gray when off */}
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={
          focus.active
            ? { background: 'rgba(57, 78, 255, 0.1)', color: 'var(--color-main)' }
            : { background: 'var(--color-gray-lightest)', color: 'var(--color-gray-medium)' }
        }
      >
        <FocusIcon size={15} />
      </span>

      <div className="flex flex-col min-w-0 flex-1">
        <span
          className="text-sm font-medium truncate"
          style={{
            color: focus.active
              ? 'var(--color-gray-darkest)'
              : 'var(--color-gray-dark)',
          }}
        >
          {focus.name}
        </span>
        <Tooltip title={focus.summary} placement="left">
          <span className="text-xs truncate cursor-default" style={{ color: 'var(--color-gray-medium)' }}>
            ~{focus.trafficPct}% · ~{focus.sessionsPerDay.toLocaleString()} sessions/day
            {!focus.mine && ` · by ${focus.createdBy}`}
          </span>
        </Tooltip>
      </div>

      <Switch
        size="small"
        checked={focus.active}
        aria-label={`${focus.name} — ${focus.active ? 'on' : 'off'}`}
        onChange={(on) => issuesStore.toggleFocus(focus.id, on)}
      />

      {/* far-right actions slot — constant width so every switch shares one edge */}
      <span className="w-6 shrink-0 flex items-center justify-center">
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
            <button
              type="button"
              aria-label="Focus actions"
              className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-gray-medium)' }}
            >
              <EllipsisVertical size={15} />
            </button>
          </Dropdown>
        )}
      </span>
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
      className="text-[11px] font-medium uppercase tracking-wider mt-3 mb-0.5"
      style={{ color: 'var(--color-gray-medium)' }}
    >
      {label}
    </div>
  );

  const content = (
    <div className="flex flex-col" style={{ width: 340 }}>
      {/* header — a real header, not a lone word: title + what this thing does */}
      <div className="pb-2.5 border-b -mx-1 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-semibold" style={{ color: 'var(--color-gray-darkest)' }}>
            Focus
          </span>
          <Tooltip
            placement="bottom"
            title="Full traffic keeps a baseline share of the daily sample; active focuses get concentrated sampling on top. Anyone can switch a focus on or off."
          >
            <span className="flex items-center cursor-help" style={{ color: 'var(--color-gray-medium)' }}>
              <Info size={14} />
            </span>
          </Tooltip>
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-gray-medium)' }}>
          Concentrate the agent's analysis on portions of your traffic.
        </div>
      </div>

      {issuesStore.focuses.length === 0 ? (
        <div className="text-sm py-3" style={{ color: 'var(--color-gray-medium)' }}>
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

      <div className="border-t mt-2.5 pt-2 -mx-1 px-1">
        <Button
          type="text"
          icon={<Plus size={15} />}
          onClick={startCreate}
          className="w-full justify-start!"
          style={{ color: 'var(--color-main)' }}
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
