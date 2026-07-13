import { Switch, Table, Tag, Tooltip, message } from 'antd';
import type { TableProps } from 'antd';
import { Globe, Split, Star } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import type { SavedSegment } from 'App/mstore/issuesStore';
import { estimateFromSeeds } from 'Components/Issues/segments/segmentUtils';
import { TextEllipsis } from 'UI';
import 'Components/Issues/segments/captureSwitch.css';

/* Data Management → Segments → "Traffic segments" tab (Mehdi 07-07).
   Every capture-ELIGIBLE segment — team-visible only, since everyone must be
   able to stop a capture — with a Capture switch per row (Gabriel 07-09).
   Same shared set the Issues popover manages: switching one on here adds it
   to the capture set there; the estimate is computed fresh at that moment.
   Private segments don't appear (make them team-visible to enable capture). */

const FELL_BACK_MSG =
  'No active segments left — capture switched to full traffic.';

function TrafficSegmentsTab({
  query,
  onOpen,
}: {
  /** the page-level search box filters whichever tab is active */
  query: string;
  onOpen: (segment: SavedSegment) => void;
}) {
  const { t } = useTranslation();
  const { issuesStore } = useStore();
  const segmentsMode = issuesStore.captureMode === 'segments';
  const activeCount = issuesStore.activeSegmentCount;

  const q = query.trim().toLowerCase();
  const list = issuesStore.captureEligible.filter(
    (s) => !q || s.name.toLowerCase().includes(q),
  );

  const onToggle = (s: SavedSegment, on: boolean) => {
    if (on && !s.isTrafficSegment) {
      // first time in the capture set — compute its estimate now
      issuesStore.enableTraffic(s.id, estimateFromSeeds(s.seeds));
    } else if (issuesStore.toggleSegment(s.id, on)) {
      message.info(t(FELL_BACK_MSG));
    }
  };

  const columns: TableProps<SavedSegment>['columns'] = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      className: 'cursor-pointer!',
      render: (name: string, s) => (
        <Tooltip title={s.summary} placement="topLeft">
          <span>
            <TextEllipsis maxWidth="320px" text={name} className="link" />
          </span>
        </Tooltip>
      ),
    },
    {
      title: t('Created by'),
      dataIndex: 'createdBy',
      key: 'createdBy',
      render: (createdBy: string, s) => (
        <div className="flex items-center gap-1">
          <span>{createdBy}</span>
          {s.mine && (
            <Tooltip title={t("You're this segment's owner")}>
              <Tag
                icon={<Star size={12} />}
                color="gold"
                className="text-xs! px-2! py-0.5! m-0! whitespace-nowrap inline-flex! items-center! gap-1! cursor-help"
              >
                {t('Owner')}
              </Tag>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: t('Traffic'),
      key: 'traffic',
      width: 120,
      render: (_: unknown, s) =>
        s.isTrafficSegment ? (
          <Tooltip title={`~${s.sessionsPerDay.toLocaleString()} sessions analysed per day`}>
            <span className="tabular-nums cursor-help">~{s.trafficPct}%</span>
          </Tooltip>
        ) : (
          <span style={{ color: 'var(--color-gray-medium)' }}>—</span>
        ),
    },
    {
      title: t('Capture'),
      key: 'capture',
      width: 100,
      render: (_: unknown, s) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            size="small"
            checked={s.isTrafficSegment && s.active}
            aria-label={`${s.name} — capture ${s.active ? 'on' : 'off'}`}
            onChange={(on) => onToggle(s, on)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      {/* which capture mode the project is in — the same shared switch as
          the Issues-title pill (this page already speaks in switches);
          with no active segment there is nothing to capture, so it waits
          disabled until a row below is switched on */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b text-sm"
        style={{ color: 'var(--color-gray-dark)' }}
      >
        <Switch
          size="small"
          checked={segmentsMode}
          disabled={!segmentsMode && activeCount === 0}
          className={`capture-switch${segmentsMode ? ' seg-live-border' : ''}`}
          checkedChildren={<Split size={10} />}
          unCheckedChildren={<Globe size={10} />}
          aria-label={`Segment capture ${segmentsMode ? 'on' : 'off'}`}
          onChange={(on) =>
            issuesStore.setCaptureMode(on ? 'segments' : 'full')
          }
        />
        {segmentsMode
          ? t(
              `Capture mode: Segments — only sessions matching the ${activeCount} active segment${activeCount === 1 ? '' : 's'} are captured.`,
            )
          : t(
              'Capture mode: Full traffic — active segments apply when capture is switched to Segments.',
            )}
      </div>
      <Table<SavedSegment>
        columns={columns}
        dataSource={list}
        pagination={false}
        rowKey="id"
        rowHoverable
        rowClassName="cursor-pointer"
        onRow={(s) => ({ onClick: () => onOpen(s) })}
        locale={{
          emptyText: q
            ? t('No segments match your search.')
            : t('No team-visible segments yet — create one to capture traffic.'),
        }}
      />
    </>
  );
}

export default observer(TrafficSegmentsTab);
