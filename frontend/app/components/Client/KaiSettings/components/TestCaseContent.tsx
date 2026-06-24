import { Button, Dropdown, Tag, Tooltip, message } from 'antd';
import {
  Calendar,
  ChevronRight,
  Clock,
  FlaskConical,
  MoreVertical,
  Play,
  Sparkles,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { TestCase } from './shared/types';
import { TESTS_GRID, scheduleLabel, scheduleShort } from './shared/utils';

interface Props {
  test: TestCase;
  onOpen: (test: TestCase) => void;
  onChange: (updated: TestCase) => void;
  onRemove: (key: string) => void;
}

/** One collapsed test row, laid out on the shared grid so columns line up.
 *  Run history (dots / last result) lives in the drawer and the Runs tab — this
 *  table is about the test's identity and config, not its run log. */
function TestCaseRow({ test, onOpen, onChange, onRemove }: Props) {
  const { t } = useTranslation();
  const isDraft = test.status === 'draft';
  const scheduled = !!test.schedule && test.schedule.days.length > 0;

  const runNow = () =>
    message.success(`${test.title} — ${t('run started, see Runs')}`);

  const menuItems = isDraft
    ? [
        { key: 'open', label: t('Review draft') },
        { type: 'divider' as const },
        { key: 'dismiss', label: t('Dismiss'), danger: true },
      ]
    : test.status === 'active'
      ? [
          { key: 'pause', label: t('Pause') },
          { key: 'open', label: t('Run settings…') },
          { type: 'divider' as const },
          { key: 'delete', label: t('Delete'), danger: true },
        ]
      : [
          { key: 'resume', label: t('Resume') },
          { key: 'open', label: t('Run settings…') },
          { type: 'divider' as const },
          { key: 'delete', label: t('Delete'), danger: true },
        ];

  const onMenuClick = ({ key }: { key: string }) => {
    if (key === 'open') onOpen(test);
    else if (key === 'run') runNow();
    else if (key === 'pause') onChange({ ...test, status: 'paused' });
    else if (key === 'resume') onChange({ ...test, status: 'active' });
    else if (key === 'dismiss' || key === 'delete') onRemove(test.key);
  };

  const leadIcon = isDraft ? (
    <Sparkles size={15} className="text-tealx shrink-0" />
  ) : (
    <FlaskConical
      size={15}
      className={`shrink-0 ${
        test.status === 'paused' ? 'text-disabled-text' : 'text-green-dark'
      }`}
    />
  );

  const statusChip = isDraft ? (
    <Tag color="cyan" className="m-0!">
      {t('Draft')}
    </Tag>
  ) : test.status === 'paused' ? (
    <Tag color="orange" className="m-0!">
      {t('Paused')}
    </Tag>
  ) : (
    <Tag color="green" className="m-0!">
      {t('Active')}
    </Tag>
  );

  return (
    <div
      className={`${TESTS_GRID} px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-active-blue select-none`}
      onClick={() => onOpen(test)}
    >
      {/* Test */}
      <div className="flex items-center gap-2 min-w-0">
        {leadIcon}
        <span className="font-medium truncate">{test.title}</span>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-1 overflow-hidden">
        {test.tags?.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 rounded bg-gray-lightest text-disabled-text truncate"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Environment */}
      <span
        className={`text-sm truncate ${
          test.envName ? 'text-disabled-text' : 'text-disabled-text italic'
        }`}
      >
        {test.envName || t('Not set')}
      </span>

      {/* Schedule — drafts have no schedule yet; it's chosen on approval */}
      {isDraft ? (
        <span className="flex items-center gap-1.5 min-w-0 text-sm text-disabled-text italic">
          <Clock size={13} className="shrink-0" />
          {t('Pending')}
        </span>
      ) : (
        <div className="flex items-center gap-1.5 min-w-0 text-sm text-disabled-text">
          {scheduled && <Calendar size={13} className="shrink-0" />}
          <Tooltip title={scheduleLabel(test.schedule)}>
            <span className="truncate">{scheduleShort(test.schedule)}</span>
          </Tooltip>
        </div>
      )}

      {/* Status */}
      <div className="min-w-0">{statusChip}</div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-0.5">
        {!isDraft && (
          <span onClick={(e) => e.stopPropagation()}>
            <Tooltip title={t('Run now')}>
              <Button
                type="text"
                size="small"
                icon={<Play size={15} />}
                aria-label={t('Run now')}
                onClick={runNow}
              />
            </Tooltip>
          </span>
        )}
        <span onClick={(e) => e.stopPropagation()}>
          <Dropdown
            trigger={['click']}
            menu={{ items: menuItems, onClick: onMenuClick }}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreVertical size={16} />}
            />
          </Dropdown>
        </span>
        <ChevronRight size={15} className="text-disabled-text shrink-0" />
      </div>
    </div>
  );
}

export default TestCaseRow;
